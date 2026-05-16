import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;
type AdminRole = "super_admin" | "admin" | "sales";
type LeadType = "contact" | "newsletter" | "careers" | "demo";

type AdminProfile = {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status = 400, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const SUPER_ADMIN_EMAIL = "techmigos.global@gmail.com";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.techmigos.com",
  "https://techmigos.com",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
  "http://localhost:4028",
  "http://127.0.0.1:4028",
];

function env(name: string) {
  return Deno.env.get(name)?.trim() || "";
}

function parseDefaultKey(jsonName: string, legacyName: string) {
  const legacy = env(legacyName);
  if (legacy) return legacy;

  const raw = env(jsonName);
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed.default || Object.values(parsed)[0] || "";
  } catch {
    return "";
  }
}

function getSupabaseUrl() {
  return env("SUPABASE_URL") || "https://aopupssndblznvbnknoh.supabase.co";
}

function getAnonKey() {
  return parseDefaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
}

function getServiceKey() {
  return parseDefaultKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
}

function getAdminClient(): SupabaseClient {
  const key = getServiceKey();
  if (!key) {
    throw new ApiError("Supabase service role secret is not configured for this API.", 500);
  }
  return createClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getAnonClient(): SupabaseClient {
  const key = getAnonKey();
  if (!key) {
    throw new ApiError("Supabase publishable/anon key is not configured for this API.", 500);
  }
  return createClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function allowedOrigin(origin: string | null) {
  if (!origin) return DEFAULT_ALLOWED_ORIGINS[0];
  const configured = env("ALLOWED_ORIGINS")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowList = configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
  if (allowList.includes(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+(?:-[a-z0-9-]+)*\.vercel\.app$/i.test(origin)) return origin;
  return allowList[0] || DEFAULT_ALLOWED_ORIGINS[0];
}

function corsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req.headers.get("origin")),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-csrf-token",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

function json(req: Request, body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function ok(req: Request, data: JsonRecord = {}, status = 200) {
  return json(req, { ok: true, data, ...data }, status);
}

function fail(req: Request, error: unknown) {
  if (error instanceof ApiError) {
    return json(
      req,
      { ok: false, error: error.message, fieldErrors: error.fieldErrors },
      error.status,
    );
  }

  console.error(error);
  return json(req, { ok: false, error: "Unexpected server error." }, 500);
}

function normalizeRoute(req: Request) {
  const pathname = new URL(req.url).pathname;
  const marker = "/functions/v1/api";
  const route = pathname.startsWith(marker) ? pathname.slice(marker.length) || "/" : pathname;
  return route.startsWith("/api/") ? route.slice(4) : route;
}

function clientIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function userAgent(req: Request) {
  return req.headers.get("user-agent") || "";
}

function stringValue(value: unknown, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function emailValue(value: unknown) {
  const email = stringValue(value, 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
}

async function readJson(req: Request) {
  try {
    return (await req.json()) as JsonRecord;
  } catch {
    throw new ApiError("Request body must be valid JSON.", 400);
  }
}

function csrfSecret() {
  const secret = env("CSRF_SECRET") || getServiceKey();
  if (!secret) throw new ApiError("CSRF secret is not configured.", 500);
  return secret;
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signCsrfPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(csrfSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(signature);
}

async function createCsrfToken() {
  const payload = `${Date.now()}.${crypto.randomUUID()}`;
  return `${payload}.${await signCsrfPayload(payload)}`;
}

async function verifyCsrf(req: Request) {
  const token = req.headers.get("x-csrf-token") || "";
  const [timestamp, nonce, signature] = token.split(".");
  if (!timestamp || !nonce || !signature) throw new ApiError("Invalid form security token.", 403);

  const createdAt = Number(timestamp);
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > 2 * 60 * 60 * 1000) {
    throw new ApiError("Expired form security token.", 403);
  }

  const expected = await signCsrfPayload(`${timestamp}.${nonce}`);
  if (signature !== expected) throw new ApiError("Invalid form security token.", 403);
}

async function checkRateLimit(
  supabase: SupabaseClient,
  bucketKey: string,
  limit: number,
  windowSeconds = 900,
) {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const { data, error } = await supabase
    .from("rate_limit_counters")
    .select("count")
    .eq("bucket_key", bucketKey)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (error) throw error;

  const nextCount = Number(data?.count || 0) + 1;
  if (nextCount > limit) {
    throw new ApiError("Too many submissions. Please try again later.", 429);
  }

  const { error: writeError } = await supabase
    .from("rate_limit_counters")
    .upsert({ bucket_key: bucketKey, window_start: windowStart, count: nextCount });

  if (writeError) throw writeError;
}

async function handleCsrf(req: Request) {
  const token = await createCsrfToken();
  return ok(req, { token });
}

async function handleContact(req: Request) {
  await verifyCsrf(req);
  const body = await readJson(req);
  const fieldErrors: Record<string, string> = {};

  const name = stringValue(body.name, 160);
  const email = emailValue(body.email);
  const message = stringValue(body.message, 5000);

  if (!name) fieldErrors.name = "Name is required.";
  if (!email) fieldErrors.email = "Valid email is required.";
  if (!message) fieldErrors.message = "Message is required.";
  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError("Please correct the highlighted fields.", 422, fieldErrors);
  }

  const supabase = getAdminClient();
  await checkRateLimit(supabase, `contact:${clientIp(req)}`, 6);

  const { error } = await supabase.from("contact_leads").insert({
    name,
    email,
    company: stringValue(body.company, 255),
    service: stringValue(body.service, 120),
    budget: stringValue(body.budget, 120),
    message,
    ip_address: clientIp(req),
    user_agent: userAgent(req),
  });

  if (error) throw error;
  return ok(req, { message: "Thanks. We received your message." }, 201);
}

async function handleNewsletter(req: Request) {
  await verifyCsrf(req);
  const body = await readJson(req);
  const email = emailValue(body.email);
  if (!email) throw new ApiError("A valid email is required.", 422, { email: "Invalid email." });

  const supabase = getAdminClient();
  await checkRateLimit(supabase, `newsletter:${clientIp(req)}`, 8);

  const { error } = await supabase.from("newsletter_subscribers").insert({
    email,
    ip_address: clientIp(req),
    user_agent: userAgent(req),
  });

  if (error) throw error;
  return ok(req, { message: "Subscription saved." }, 201);
}

async function handleCareer(req: Request) {
  await verifyCsrf(req);
  const form = await req.formData();
  const honeypot = stringValue(form.get("company_website"));
  if (honeypot) return ok(req, { message: "Application received." }, 201);

  const fieldErrors: Record<string, string> = {};
  const jobTitle = stringValue(form.get("jobTitle"), 255);
  const name = stringValue(form.get("name"), 160);
  const email = emailValue(form.get("email"));
  const coverLetter = stringValue(form.get("coverLetter"), 5000);
  const cv = form.get("cv");

  if (!jobTitle) fieldErrors.jobTitle = "Job title is required.";
  if (!name) fieldErrors.name = "Name is required.";
  if (!email) fieldErrors.email = "Valid email is required.";
  if (coverLetter.length < 30) fieldErrors.coverLetter = "Cover letter is too short.";
  if (!(cv instanceof File) || cv.size <= 0) fieldErrors.cv = "Resume file is required.";
  if (cv instanceof File && cv.size > 5 * 1024 * 1024) fieldErrors.cv = "Resume must be under 5 MB.";

  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError("Please correct the highlighted fields.", 422, fieldErrors);
  }

  const supabase = getAdminClient();
  await checkRateLimit(supabase, `careers:${clientIp(req)}`, 5);

  const file = cv as File;
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const storedName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const storagePath = `careers/${storedName}`;
  const { error: uploadError } = await supabase.storage
    .from("career-resumes")
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { error } = await supabase.from("career_applications").insert({
    job_title: jobTitle,
    name,
    email,
    linkedin: stringValue(form.get("linkedin"), 512),
    portfolio: stringValue(form.get("portfolio"), 512),
    cover_letter: coverLetter,
    resume_original_name: file.name,
    resume_stored_file_name: storedName,
    resume_mime_type: file.type || "",
    resume_size: file.size,
    resume_path: storagePath,
    ip_address: clientIp(req),
    user_agent: userAgent(req),
  });

  if (error) throw error;
  return ok(req, { message: "Application received." }, 201);
}

async function handleDemo(req: Request) {
  const body = await readJson(req);
  const fieldErrors: Record<string, string> = {};
  const name = stringValue(body.name, 160);
  const school = stringValue(body.school, 255);
  const phone = stringValue(body.phone, 80);
  const digits = phone.replace(/\D/g, "");

  if (!name) fieldErrors.name = "Name is required.";
  if (!school) fieldErrors.school = "School name is required.";
  if (digits.length < 10) fieldErrors.phone = "Valid phone number is required.";
  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError("Please correct the highlighted fields.", 422, fieldErrors);
  }

  const supabase = getAdminClient();
  await checkRateLimit(supabase, `demo:${clientIp(req)}`, 6);

  const { error } = await supabase.from("demo_requests").insert({
    name,
    school,
    phone,
    source_path: stringValue(body.sourcePath, 255) || "/showcase",
    ip_address: clientIp(req),
    user_agent: userAgent(req),
  });

  if (error) throw error;
  return ok(req, { message: "Demo request saved." }, 201);
}

function toAdminUser(profile: AdminProfile) {
  return {
    id: profile.user_id,
    username: profile.username,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

async function ensureSuperAdminProfile(supabase: SupabaseClient, user: User) {
  const email = user.email?.toLowerCase() || "";
  if (email !== SUPER_ADMIN_EMAIL) return null;

  const { data, error } = await supabase
    .from("admin_profiles")
    .upsert({
      user_id: user.id,
      username: "techmigos-global",
      email,
      full_name: String(user.user_metadata?.full_name || "Techmigos Global"),
      role: "super_admin",
      is_active: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as AdminProfile;
}

async function profileForUser(supabase: SupabaseClient, user: User) {
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  const profile = (data as AdminProfile | null) || (await ensureSuperAdminProfile(supabase, user));
  if (!profile || !profile.is_active) {
    throw new ApiError("This account is not enabled for Techmigos admin access.", 403);
  }
  return profile;
}

async function requireAdmin(req: Request, allowedRoles: AdminRole[] = []) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiError("Admin authentication is required.", 401);

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new ApiError("Admin session is invalid or expired.", 401);

  const profile = await profileForUser(supabase, data.user);
  if (
    profile.role !== "super_admin" &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(profile.role)
  ) {
    throw new ApiError("Your role does not have access to this resource.", 403);
  }

  return { supabase, user: data.user, profile };
}

async function logAdminAction(
  supabase: SupabaseClient,
  req: Request,
  profile: AdminProfile,
  action: string,
  metadata: JsonRecord = {},
) {
  await supabase.from("admin_activity_logs").insert({
    user_id: profile.user_id,
    action,
    metadata,
    ip_address: clientIp(req),
    user_agent: userAgent(req),
  });
}

async function handleAdminLogin(req: Request) {
  const body = await readJson(req);
  const rawEmail = stringValue(body.email || body.username, 255).toLowerCase();
  const password = stringValue(body.password, 255);
  if (!rawEmail || !password) throw new ApiError("Email and password are required.", 422);

  const admin = getAdminClient();
  let email = rawEmail;
  if (!rawEmail.includes("@")) {
    const { data, error } = await admin
      .from("admin_profiles")
      .select("email")
      .eq("username", rawEmail)
      .maybeSingle();
    if (error) throw error;
    email = String(data?.email || "");
  }
  if (!email) throw new ApiError("Invalid email or password.", 401);

  const anon = getAnonClient();
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw new ApiError("Invalid email or password.", 401);

  const profile = await profileForUser(admin, data.user);
  await logAdminAction(admin, req, profile, "admin.auth.login");

  return ok(req, {
    user: toAdminUser(profile),
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      expiresIn: data.session.expires_in,
      tokenType: data.session.token_type,
    },
  });
}

async function handleAdminMe(req: Request) {
  const { profile } = await requireAdmin(req);
  return ok(req, { user: toAdminUser(profile) });
}

async function handleAdminLogout(req: Request) {
  const { supabase, profile } = await requireAdmin(req);
  await logAdminAction(supabase, req, profile, "admin.auth.logout");
  return ok(req, { message: "Logged out." });
}

function mapTestimonial(row: JsonRecord) {
  return {
    id: row.id,
    quote: row.quote,
    name: row.name,
    role: row.role,
    company: row.company,
    avatar: row.avatar,
    result: row.result,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function testimonialInput(body: JsonRecord) {
  const quote = stringValue(body.quote, 5000);
  const name = stringValue(body.name, 180);
  const role = stringValue(body.role, 180);
  const company = stringValue(body.company, 180);
  const result = stringValue(body.result, 255);
  const fieldErrors: Record<string, string> = {};
  if (!quote) fieldErrors.quote = "Quote is required.";
  if (!name) fieldErrors.name = "Name is required.";
  if (!role) fieldErrors.role = "Role is required.";
  if (!company) fieldErrors.company = "Company is required.";
  if (!result) fieldErrors.result = "Result is required.";
  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError("Please correct the highlighted fields.", 422, fieldErrors);
  }
  return {
    quote,
    name,
    role,
    company,
    result,
    avatar: stringValue(body.avatar, 512),
    sort_order: Number(body.sortOrder || 0),
    is_active: Boolean(body.isActive),
  };
}

async function handleTestimonials(req: Request, route: string) {
  const { supabase, profile } = await requireAdmin(req, ["admin"]);
  const id = route.match(/^\/admin\/testimonials\/(\d+)$/)?.[1];

  if (req.method === "GET" && !id) {
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: false });
    if (error) throw error;
    return ok(req, { items: (data || []).map(mapTestimonial) });
  }

  if (req.method === "POST" && !id) {
    const payload = testimonialInput(await readJson(req));
    const { data, error } = await supabase.from("testimonials").insert(payload).select("*").single();
    if (error) throw error;
    await logAdminAction(supabase, req, profile, "admin.testimonials.create", { id: data.id });
    return ok(req, { item: mapTestimonial(data) }, 201);
  }

  if (req.method === "PUT" && id) {
    const payload = testimonialInput(await readJson(req));
    const { data, error } = await supabase
      .from("testimonials")
      .update(payload)
      .eq("id", Number(id))
      .select("*")
      .single();
    if (error) throw error;
    await logAdminAction(supabase, req, profile, "admin.testimonials.update", { id });
    return ok(req, { item: mapTestimonial(data) });
  }

  if (req.method === "DELETE" && id) {
    const { error } = await supabase.from("testimonials").delete().eq("id", Number(id));
    if (error) throw error;
    await logAdminAction(supabase, req, profile, "admin.testimonials.delete", { id });
    return ok(req, { deleted: true });
  }

  throw new ApiError("Unsupported testimonials route.", 405);
}

function mapPortfolio(project: JsonRecord, results: JsonRecord[]) {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    category: project.category,
    emoji: project.emoji,
    tags: Array.isArray(project.tags) ? project.tags : [],
    image: project.image,
    description: project.description,
    result: project.result,
    overview: project.overview,
    challenge: project.challenge,
    solution: project.solution,
    timeline: project.timeline,
    team: project.team,
    services: project.services,
    featured: project.featured,
    isActive: project.is_active,
    sortOrder: project.sort_order,
    results: results.map((item) => ({ id: item.id, metric: item.metric, label: item.label })),
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
}

function portfolioInput(body: JsonRecord) {
  const required = ["title", "slug", "category", "description", "result", "overview", "challenge", "solution", "timeline", "team", "services"];
  const fieldErrors: Record<string, string> = {};
  required.forEach((key) => {
    if (!stringValue(body[key], 3000)) fieldErrors[key] = `${key} is required.`;
  });
  const results = Array.isArray(body.results) ? body.results : [];
  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError("Please correct the highlighted fields.", 422, fieldErrors);
  }
  return {
    project: {
      title: stringValue(body.title, 255),
      slug: stringValue(body.slug, 190).toLowerCase(),
      category: stringValue(body.category, 120),
      emoji: stringValue(body.emoji, 32),
      tags: Array.isArray(body.tags) ? body.tags.map((tag) => stringValue(tag, 80)).filter(Boolean) : [],
      image: stringValue(body.image, 512),
      description: stringValue(body.description, 5000),
      result: stringValue(body.result, 255),
      overview: stringValue(body.overview, 5000),
      challenge: stringValue(body.challenge, 5000),
      solution: stringValue(body.solution, 5000),
      timeline: stringValue(body.timeline, 120),
      team: stringValue(body.team, 120),
      services: stringValue(body.services, 255),
      featured: Boolean(body.featured),
      is_active: Boolean(body.isActive),
      sort_order: Number(body.sortOrder || 0),
    },
    results: results
      .map((item, index) => ({
        metric: stringValue((item as JsonRecord).metric, 120),
        label: stringValue((item as JsonRecord).label, 255),
        sort_order: index,
      }))
      .filter((item) => item.metric && item.label),
  };
}

async function loadPortfolioItems(supabase: SupabaseClient, id?: number) {
  let query = supabase
    .from("portfolio_projects")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: false });
  if (id) query = query.eq("id", id);
  const { data: projects, error } = await query;
  if (error) throw error;
  const ids = (projects || []).map((project) => project.id);
  const { data: results, error: resultError } = ids.length
    ? await supabase
      .from("portfolio_results")
      .select("*")
      .in("project_id", ids)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
    : { data: [], error: null };
  if (resultError) throw resultError;
  return (projects || []).map((project) =>
    mapPortfolio(project, (results || []).filter((item) => item.project_id === project.id))
  );
}

async function replacePortfolioResults(
  supabase: SupabaseClient,
  projectId: number,
  results: Array<{ metric: string; label: string; sort_order: number }>,
) {
  const { error: deleteError } = await supabase
    .from("portfolio_results")
    .delete()
    .eq("project_id", projectId);
  if (deleteError) throw deleteError;
  if (results.length === 0) return;
  const { error } = await supabase
    .from("portfolio_results")
    .insert(results.map((item) => ({ ...item, project_id: projectId })));
  if (error) throw error;
}

async function handlePortfolio(req: Request, route: string) {
  const { supabase, profile } = await requireAdmin(req, ["admin"]);
  const id = route.match(/^\/admin\/portfolio\/(\d+)$/)?.[1];

  if (req.method === "GET" && !id) {
    return ok(req, { items: await loadPortfolioItems(supabase) });
  }

  if (req.method === "POST" && !id) {
    const payload = portfolioInput(await readJson(req));
    const { data, error } = await supabase
      .from("portfolio_projects")
      .insert(payload.project)
      .select("id")
      .single();
    if (error) throw error;
    await replacePortfolioResults(supabase, data.id, payload.results);
    await logAdminAction(supabase, req, profile, "admin.portfolio.create", { id: data.id });
    return ok(req, { item: (await loadPortfolioItems(supabase, data.id))[0] }, 201);
  }

  if (req.method === "PUT" && id) {
    const payload = portfolioInput(await readJson(req));
    const projectId = Number(id);
    const { error } = await supabase
      .from("portfolio_projects")
      .update(payload.project)
      .eq("id", projectId);
    if (error) throw error;
    await replacePortfolioResults(supabase, projectId, payload.results);
    await logAdminAction(supabase, req, profile, "admin.portfolio.update", { id });
    return ok(req, { item: (await loadPortfolioItems(supabase, projectId))[0] });
  }

  if (req.method === "DELETE" && id) {
    const { error } = await supabase.from("portfolio_projects").delete().eq("id", Number(id));
    if (error) throw error;
    await logAdminAction(supabase, req, profile, "admin.portfolio.delete", { id });
    return ok(req, { deleted: true });
  }

  throw new ApiError("Unsupported portfolio route.", 405);
}

function leadTable(type: LeadType) {
  return {
    contact: "contact_leads",
    newsletter: "newsletter_subscribers",
    careers: "career_applications",
    demo: "demo_requests",
  }[type];
}

function mapLead(type: LeadType, row: JsonRecord, notes: JsonRecord[] = []) {
  const subject =
    type === "contact"
      ? stringValue(row.company || row.service)
      : type === "careers"
        ? stringValue(row.job_title)
        : type === "demo"
          ? stringValue(row.school)
          : "";
  const details =
    type === "contact"
      ? stringValue(row.message, 5000)
      : type === "careers"
        ? stringValue(row.cover_letter, 5000)
        : type === "demo"
          ? `School: ${stringValue(row.school)} | Phone: ${stringValue(row.phone)}`
          : "";

  return {
    id: row.id,
    leadType: type,
    name: type === "newsletter" ? "" : row.name,
    email: row.email || "",
    phone: row.phone || "",
    subject,
    details,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    nextFollowupAt: row.next_followup_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resumePath: row.resume_path,
    notes: notes.map((note) => ({
      id: note.id,
      note: note.note,
      createdAt: note.created_at,
      author: note.admin_profiles
        ? {
          username: (note.admin_profiles as JsonRecord).username,
          fullName: (note.admin_profiles as JsonRecord).full_name,
        }
        : null,
    })),
  };
}

async function handleLeads(req: Request, route: string) {
  const { supabase, profile } = await requireAdmin(req, ["admin", "sales"]);
  const itemMatch = route.match(/^\/admin\/leads\/([a-z]+)\/(\d+)(?:\/notes)?$/);

  if (req.method === "GET" && route === "/admin/leads") {
    const url = new URL(req.url);
    const typeFilter = stringValue(url.searchParams.get("type")) as LeadType | "";
    const status = stringValue(url.searchParams.get("status"));
    const priority = stringValue(url.searchParams.get("priority"));
    const search = stringValue(url.searchParams.get("search")).toLowerCase();
    const types: LeadType[] = typeFilter
      ? [typeFilter as LeadType]
      : ["contact", "newsletter", "careers", "demo"];

    const items: ReturnType<typeof mapLead>[] = [];
    for (const type of types) {
      if (!leadTable(type)) continue;
      const { data, error } = await supabase
        .from(leadTable(type))
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      items.push(...(data || []).map((row) => mapLead(type, row)));
    }

    const filtered = items
      .filter((item) => (!status || item.status === status))
      .filter((item) => (!priority || item.priority === priority))
      .filter((item) => {
        if (!search) return true;
        return `${item.name} ${item.email} ${item.subject} ${item.details}`.toLowerCase().includes(search);
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    const today = new Date().toISOString().slice(0, 10);
    const counters = {
      newToday: filtered.filter((item) => String(item.createdAt || "").startsWith(today)).length,
      pendingFollowups: filtered.filter((item) => item.nextFollowupAt && item.status !== "closed").length,
      bySource: {
        contact: filtered.filter((item) => item.leadType === "contact").length,
        newsletter: filtered.filter((item) => item.leadType === "newsletter").length,
        careers: filtered.filter((item) => item.leadType === "careers").length,
        demo: filtered.filter((item) => item.leadType === "demo").length,
      },
    };

    await logAdminAction(supabase, req, profile, "admin.leads.list", { count: filtered.length });
    return ok(req, { items: filtered.slice(0, Number(url.searchParams.get("limit") || 100)), counters });
  }

  if (itemMatch) {
    const type = itemMatch[1] as LeadType;
    const id = Number(itemMatch[2]);
    const table = leadTable(type);
    if (!table || !id) throw new ApiError("Invalid lead reference.", 400);

    if (req.method === "GET") {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).single();
      if (error) throw error;
      const { data: notes, error: notesError } = await supabase
        .from("lead_notes")
        .select("*, admin_profiles(username, full_name)")
        .eq("lead_type", type)
        .eq("lead_id", id)
        .order("created_at", { ascending: false });
      if (notesError) throw notesError;
      return ok(req, { item: mapLead(type, data, notes || []) });
    }

    if (req.method === "PATCH" && !route.endsWith("/notes")) {
      const body = await readJson(req);
      const payload = {
        status: stringValue(body.status) || "new",
        priority: stringValue(body.priority) || "medium",
        assigned_to: body.assignedTo ? stringValue(body.assignedTo) : null,
        next_followup_at: body.nextFollowupAt ? stringValue(body.nextFollowupAt) : null,
      };
      const { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*").single();
      if (error) throw error;
      await logAdminAction(supabase, req, profile, "admin.leads.update", { type, id });
      return ok(req, { item: mapLead(type, data) });
    }

    if (req.method === "POST" && route.endsWith("/notes")) {
      const body = await readJson(req);
      const note = stringValue(body.note, 3000);
      if (!note) throw new ApiError("Note is required.", 422);
      const { error } = await supabase.from("lead_notes").insert({
        lead_type: type,
        lead_id: id,
        author_user_id: profile.user_id,
        note,
      });
      if (error) throw error;
      await logAdminAction(supabase, req, profile, "admin.leads.note.create", { type, id });
      return ok(req, { created: true }, 201);
    }
  }

  throw new ApiError("Unsupported leads route.", 405);
}

function normalizeRole(value: unknown, creatorRole: AdminRole): AdminRole {
  const role = stringValue(value).toLowerCase();
  if (role === "super_admin" && creatorRole === "super_admin") return "super_admin";
  if (role === "admin" || role === "editor") return "admin";
  return "sales";
}

async function handleUsers(req: Request, route: string) {
  const { supabase, profile } = await requireAdmin(req, ["super_admin"]);
  const id = route.match(/^\/admin\/users\/([0-9a-f-]+)$/)?.[1];

  if (req.method === "GET" && !id) {
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ok(req, { items: (data || []).map((item) => toAdminUser(item as AdminProfile)) });
  }

  if (req.method === "POST" && !id) {
    const body = await readJson(req);
    const email = emailValue(body.email);
    const password = stringValue(body.password, 255);
    const fullName = stringValue(body.fullName, 255);
    const username = stringValue(body.username || email.split("@")[0], 120).toLowerCase();
    if (!email || !password || password.length < 8 || !fullName) {
      throw new ApiError("Email, full name, and an 8+ character password are required.", 422);
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !created.user) throw createError || new ApiError("Could not create user.", 500);

    const role = normalizeRole(body.role, profile.role);
    const { data, error } = await supabase
      .from("admin_profiles")
      .upsert({
        user_id: created.user.id,
        username,
        email,
        full_name: fullName,
        role,
        is_active: Boolean(body.isActive ?? true),
      })
      .select("*")
      .single();
    if (error) throw error;
    await logAdminAction(supabase, req, profile, "admin.users.create", { id: created.user.id });
    return ok(req, { item: toAdminUser(data as AdminProfile) }, 201);
  }

  if ((req.method === "PATCH" || req.method === "PUT") && id) {
    const body = await readJson(req);
    const payload: JsonRecord = {};
    if (typeof body.isActive === "boolean") payload.is_active = body.isActive;
    if (body.role) payload.role = normalizeRole(body.role, profile.role);
    if (body.fullName) payload.full_name = stringValue(body.fullName, 255);
    const { data, error } = await supabase
      .from("admin_profiles")
      .update(payload)
      .eq("user_id", id)
      .select("*")
      .single();
    if (error) throw error;
    await logAdminAction(supabase, req, profile, "admin.users.update", { id });
    return ok(req, { item: toAdminUser(data as AdminProfile) });
  }

  throw new ApiError("Unsupported users route.", 405);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  try {
    const route = normalizeRoute(req);

    if (req.method === "GET" && route === "/csrf") return await handleCsrf(req);
    if (req.method === "POST" && route === "/leads/contact") return await handleContact(req);
    if (req.method === "POST" && route === "/leads/newsletter") return await handleNewsletter(req);
    if (req.method === "POST" && route === "/leads/careers") return await handleCareer(req);
    if (req.method === "POST" && route === "/leads/demo") return await handleDemo(req);

    if (req.method === "POST" && route === "/admin/auth/login") return await handleAdminLogin(req);
    if (req.method === "GET" && route === "/admin/auth/me") return await handleAdminMe(req);
    if (req.method === "POST" && route === "/admin/auth/logout") return await handleAdminLogout(req);

    if (route.startsWith("/admin/testimonials")) return await handleTestimonials(req, route);
    if (route.startsWith("/admin/portfolio")) return await handlePortfolio(req, route);
    if (route.startsWith("/admin/leads")) return await handleLeads(req, route);
    if (route.startsWith("/admin/users")) return await handleUsers(req, route);

    throw new ApiError("API route not found.", 404);
  } catch (error) {
    return fail(req, error);
  }
});
