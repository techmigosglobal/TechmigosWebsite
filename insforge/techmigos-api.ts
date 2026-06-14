declare const Deno: { env: { get(key: string): string | undefined } };

const API_BASE_URL = Deno.env.get("INSFORGE_BASE_URL") || "https://n2hhxvw3.ap-southeast.insforge.app";
const API_KEY = Deno.env.get("INSFORGE_API_KEY");
const CSRF_SECRET = Deno.env.get("CSRF_SECRET") || API_KEY || "techmigos-insforge-csrf";
const LEAD_NOTIFICATION_EMAIL = Deno.env.get("LEAD_NOTIFICATION_EMAIL") || "";
const LEAD_NOTIFICATION_FROM = Deno.env.get("LEAD_NOTIFICATION_FROM") || "TechMigos Website <notifications@techmigos.com>";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY") || "";
const MSG91_EMAIL_DOMAIN = Deno.env.get("MSG91_EMAIL_DOMAIN") || "mail.techmigos.com";
const MSG91_EMAIL_FROM = Deno.env.get("MSG91_EMAIL_FROM") || "no-reply@mail.techmigos.com";
const MSG91_EMAIL_TO_NAME = Deno.env.get("MSG91_EMAIL_TO_NAME") || "TechMigos";
const MSG91_EMAIL_TEMPLATE_ID = Deno.env.get("MSG91_EMAIL_TEMPLATE_ID") || "";
const MSG91_CLIENT_ACK_TEMPLATE_ID = Deno.env.get("MSG91_CLIENT_ACK_TEMPLATE_ID") || "";
const MSG91_MARKETING_TEMPLATE_ID = Deno.env.get("MSG91_MARKETING_TEMPLATE_ID") || "";
const MSG91_INVOICE_TEMPLATE_ID = Deno.env.get("MSG91_INVOICE_TEMPLATE_ID") || MSG91_MARKETING_TEMPLATE_ID;
const LEAD_NOTIFICATION_WEBHOOK_URL = Deno.env.get("LEAD_NOTIFICATION_WEBHOOK_URL") || "";
const SIMPLE_ADMIN_USERNAME = Deno.env.get("SIMPLE_ADMIN_USERNAME") || "vinay";
const SIMPLE_ADMIN_PASSWORD = Deno.env.get("SIMPLE_ADMIN_PASSWORD") || "Vinay098";
const SIMPLE_ADMIN_TOKEN = "simple-admin-vinay";

type JsonRecord = Record<string, unknown>;

class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(message: string, status = 400, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function allowedOrigin(origin: string | null) {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowList = configured.length
    ? configured
    : [
        "https://www.techmigos.com",
        "https://techmigos.com",
        "http://localhost:4321",
        "http://127.0.0.1:4321",
        "http://localhost:4028",
        "http://127.0.0.1:4028",
      ];

  if (origin && allowList.includes(origin)) return origin;
  if (origin && /^https:\/\/[a-z0-9-]+(?:-[a-z0-9-]+)*\.vercel\.app$/i.test(origin)) return origin;
  return allowList[0];
}

function corsHeaders(req: Request) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req.headers.get("origin")),
    "Access-Control-Allow-Headers": "authorization, x-techmigos-route, content-type, x-csrf-token",
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
    return json(req, { ok: false, error: error.message, fieldErrors: error.fieldErrors }, error.status);
  }
  console.error(error);
  return json(req, { ok: false, error: "Unexpected server error." }, 500);
}

function routeFor(req: Request) {
  const headerRoute = req.headers.get("x-techmigos-route");
  if (headerRoute) return headerRoute.startsWith("/") ? headerRoute : `/${headerRoute}`;
  const url = new URL(req.url);
  return url.searchParams.get("route") || "/";
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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function numberValue(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function readJson(req: Request) {
  try {
    return (await req.json()) as JsonRecord;
  } catch {
    throw new ApiError("Request body must be valid JSON.", 400);
  }
}

function requireApiKey() {
  if (!API_KEY) throw new ApiError("InsForge API key is not configured.", 500);
  return API_KEY;
}

async function insforge(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-api-key", requireApiKey());
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(data?.message || data?.error || "InsForge request failed.", response.status);
  }
  return data;
}

async function insertRecord(tableName: string, row: JsonRecord) {
  const data = await insforge(`/api/database/records/${tableName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Prefer": "return=representation" },
    body: JSON.stringify([row]),
  });
  return Array.isArray(data) ? data[0] : null;
}

async function updateRecord(tableName: string, id: unknown, row: JsonRecord) {
  if (!id) return;
  await insforge(`/api/database/records/${tableName}?id=eq.${encodeURIComponent(String(id))}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row),
  });
}

async function patchRecords(tableName: string, query: string, row: JsonRecord) {
  await insforge(`/api/database/records/${tableName}?${query}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row),
  });
}

async function listRecords(tableName: string, query = "") {
  const suffix = query ? `?${query}` : "";
  const data = await insforge(`/api/database/records/${tableName}${suffix}`);
  return Array.isArray(data) ? data : [];
}

async function getRecordById(tableName: string, id: unknown) {
  const rows = await listRecords(tableName, `id=eq.${encodeURIComponent(String(id))}&limit=1`);
  return rows[0] || null;
}

function leadSubject(type: string, lead: JsonRecord) {
  if (type === "newsletter") return `New newsletter signup: ${lead.email || "unknown"}`;
  if (type === "career") return `New career application: ${lead.name || "Candidate"}`;
  return `New ${type} lead: ${lead.name || lead.email || "Website visitor"}`;
}

function leadText(type: string, lead: JsonRecord) {
  const lines = [
    `Type: ${type}`,
    `Name: ${lead.name || ""}`,
    `Email: ${lead.email || ""}`,
    `Company: ${lead.company || ""}`,
    `Service/Topic: ${lead.service || ""}`,
    `Budget/Priority: ${lead.budget || lead.priority || ""}`,
    `Source: ${lead.source_path || ""}`,
    "",
    String(lead.message || lead.cover_letter || ""),
  ];
  return lines.filter((line) => line.trim() !== "").join("\n");
}

async function postMsg91TemplateEmail(toEmail: string, toName: string, templateId: string, variables: JsonRecord) {
  if (!MSG91_AUTH_KEY || !templateId || !toEmail) return false;

  const response = await fetch("https://control.msg91.com/api/v5/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "authkey": MSG91_AUTH_KEY,
    },
    body: JSON.stringify({
      recipients: [
        {
          to: [
            {
              email: toEmail,
              name: toName || toEmail,
            },
          ],
          variables,
        },
      ],
      from: {
        email: MSG91_EMAIL_FROM,
      },
      domain: MSG91_EMAIL_DOMAIN,
      template_id: templateId,
    }),
  });

  if (!response.ok) throw new ApiError("MSG91 email notification failed.", 502);
  return true;
}

function msg91Variables(type: string, lead: JsonRecord, subject: string, text: string) {
  return {
    LEAD_TYPE: type,
    LEAD_SUBJECT: subject,
    LEAD_NAME: String(lead.name || ""),
    LEAD_EMAIL: String(lead.email || ""),
    LEAD_PHONE: String(lead.phone || ""),
    LEAD_COMPANY: String(lead.company || ""),
    LEAD_SERVICE: String(lead.service || ""),
    LEAD_BUDGET: String(lead.budget || lead.priority || ""),
    LEAD_SOURCE: String(lead.source_path || ""),
    LEAD_MESSAGE: String(lead.message || lead.cover_letter || ""),
    LEAD_SUMMARY: text,
  };
}

function clientAckSubject(type: string) {
  if (type === "newsletter") return "Thanks for subscribing to TechMigos";
  if (type === "career") return "Thanks for applying to TechMigos";
  return "Thanks for contacting TechMigos";
}

async function sendMsg91Email(type: string, lead: JsonRecord, subject: string, text: string) {
  if (!MSG91_AUTH_KEY || !MSG91_EMAIL_TEMPLATE_ID || !LEAD_NOTIFICATION_EMAIL) return false;
  return await postMsg91TemplateEmail(
    LEAD_NOTIFICATION_EMAIL,
    MSG91_EMAIL_TO_NAME,
    MSG91_EMAIL_TEMPLATE_ID,
    msg91Variables(type, lead, subject, text),
  );
}

async function sendClientAcknowledgement(type: string, lead: JsonRecord) {
  const email = emailValue(lead.email);
  if (!MSG91_AUTH_KEY || !MSG91_CLIENT_ACK_TEMPLATE_ID || !email) return false;

  const subject = clientAckSubject(type);
  const text = leadText(type, lead);
  return await postMsg91TemplateEmail(
    email,
    stringValue(lead.name, 160) || email,
    MSG91_CLIENT_ACK_TEMPLATE_ID,
    {
      ...msg91Variables(type, lead, subject, text),
      ACK_SUBJECT: subject,
      CLIENT_NAME: String(lead.name || "there"),
      CLIENT_EMAIL: email,
      CLIENT_COMPANY: String(lead.company || ""),
      CLIENT_SERVICE: String(lead.service || lead.job_title || ""),
      CLIENT_MESSAGE: String(lead.message || lead.cover_letter || ""),
      CLIENT_SOURCE: String(lead.source_path || ""),
    },
  );
}

async function notifyLead(type: string, lead: JsonRecord) {
  const subject = leadSubject(type, lead);
  const text = leadText(type, lead);
  let sent = false;

  if (LEAD_NOTIFICATION_WEBHOOK_URL) {
    const response = await fetch(LEAD_NOTIFICATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, subject, type, lead }),
    });
    if (!response.ok) throw new ApiError("Lead webhook notification failed.", 502);
    sent = true;
  }

  if (await sendMsg91Email(type, lead, subject, text)) {
    sent = true;
  }

  if (RESEND_API_KEY && LEAD_NOTIFICATION_EMAIL) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: LEAD_NOTIFICATION_FROM,
        to: [LEAD_NOTIFICATION_EMAIL],
        subject,
        text,
      }),
    });
    if (!response.ok) throw new ApiError("Lead email notification failed.", 502);
    sent = true;
  }

  return sent ? "sent" : "not_configured";
}

async function insertLead(tableName: string, type: string, row: JsonRecord) {
  const created = await insertRecord(tableName, {
    ...row,
    notification_status: "pending",
  });
  const id = created?.id;

  try {
    await createCrmLeadFromPublic(tableName, type, row, created || {});
  } catch (error) {
    console.error("CRM lead sync failed", error);
  }

  try {
    const notificationStatus = await notifyLead(type, row);
    const acknowledgementSent = await sendClientAcknowledgement(type, row);
    await updateRecord(tableName, id, {
      notification_status: acknowledgementSent || notificationStatus === "sent" ? "sent" : notificationStatus,
      notified_at: acknowledgementSent || notificationStatus === "sent" ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error("Lead notification failed", error);
    await updateRecord(tableName, id, { notification_status: "failed" });
  }

  return created;
}

async function createCrmLeadFromPublic(tableName: string, type: string, row: JsonRecord, created: JsonRecord) {
  const email = emailValue(row.email);
  if (!email) return;

  const name = stringValue(row.name || email, 160) || email;
  const isNewsletter = type === "newsletter";
  await insertRecord("crm_leads", {
    public_source_table: tableName,
    public_source_id: created.id || null,
    name,
    email,
    company: stringValue(row.company, 255),
    service: stringValue(row.service || row.job_title || type, 160),
    budget: stringValue(row.budget || row.priority, 120),
    message: stringValue(row.message || row.cover_letter || (isNewsletter ? "Newsletter subscription" : ""), 5000),
    source_path: stringValue(row.source_path, 255),
    status: "new",
    priority: isNewsletter ? "low" : "medium",
    marketing_opt_in: isNewsletter,
  });
}

async function signCsrfPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(CSRF_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const bytes = new Uint8Array(signature);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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

async function checkRateLimit(req: Request, bucketKey: string, limit: number, windowSeconds = 900) {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const encodedKey = encodeURIComponent(bucketKey);
  const existing = await insforge(
    `/api/database/records/rate_limit_counters?bucket_key=eq.${encodedKey}&window_start=eq.${windowStart}`,
  );
  const nextCount = Number(existing?.[0]?.count || 0) + 1;
  if (nextCount > limit) throw new ApiError("Too many submissions. Please try again later.", 429);

  if (existing?.[0]) {
    await insforge(`/api/database/records/rate_limit_counters?bucket_key=eq.${encodedKey}&window_start=eq.${windowStart}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: nextCount, updated_at: new Date().toISOString() }),
    });
    return;
  }

  await insertRecord("rate_limit_counters", {
    bucket_key: bucketKey,
    window_start: windowStart,
    count: nextCount,
  });
}

async function handleCsrf(req: Request) {
  return ok(req, { token: await createCsrfToken() });
}

async function handleContact(req: Request) {
  await verifyCsrf(req);
  const body = await readJson(req);
  if (stringValue(body.company_website)) return ok(req, { message: "Thanks. We received your message." }, 201);

  const fieldErrors: Record<string, string> = {};
  const name = stringValue(body.name, 160);
  const email = emailValue(body.email);
  const message = stringValue(body.message, 5000);

  if (!name) fieldErrors.name = "Name is required.";
  if (!email) fieldErrors.email = "Valid email is required.";
  if (!message) fieldErrors.message = "Message is required.";
  if (Object.keys(fieldErrors).length) throw new ApiError("Please correct the highlighted fields.", 422, fieldErrors);

  await checkRateLimit(req, `contact:${clientIp(req)}`, 6);
  await insertLead("contact_leads", "contact", {
    name,
    email,
    company: stringValue(body.company, 255),
    service: stringValue(body.service, 120),
    budget: stringValue(body.budget, 120),
    message,
    source_path: stringValue(body.sourcePath, 255) || "/contact",
    ip_address: clientIp(req),
    user_agent: userAgent(req),
  });
  return ok(req, { message: "Thanks. We received your message." }, 201);
}

async function handleNewsletter(req: Request) {
  await verifyCsrf(req);
  const body = await readJson(req);
  const email = emailValue(body.email);
  if (!email) throw new ApiError("A valid email is required.", 422, { email: "Invalid email." });

  await checkRateLimit(req, `newsletter:${clientIp(req)}`, 8);
  await insertLead("newsletter_subscribers", "newsletter", {
    email,
    source_path: stringValue(body.sourcePath, 255) || "/",
    ip_address: clientIp(req),
    user_agent: userAgent(req),
  });
  return ok(req, { message: "Subscription saved." }, 201);
}

async function uploadResume(file: Blob, storedName: string) {
  const form = new FormData();
  form.append("file", file, storedName);
  const response = await fetch(`${API_BASE_URL}/api/storage/buckets/career-resumes/objects/careers/${storedName}`, {
    method: "POST",
    headers: { "x-api-key": requireApiKey() },
    body: form,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new ApiError(text || "Could not upload resume.", response.status);
  }
  return text ? JSON.parse(text) : { key: `careers/${storedName}` };
}

async function handleCareer(req: Request) {
  await verifyCsrf(req);
  if (req.headers.get("content-type")?.includes("application/json")) {
    return await handleCareerJson(req);
  }

  const form = await req.formData();
  if (stringValue(form.get("company_website"))) return ok(req, { message: "Application received." }, 201);

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
  if (Object.keys(fieldErrors).length) throw new ApiError("Please correct the highlighted fields.", 422, fieldErrors);

  await checkRateLimit(req, `careers:${clientIp(req)}`, 5);
  const file = cv as File;
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const storedName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  let upload: JsonRecord = {};
  try {
    upload = await uploadResume(file, storedName);
  } catch (error) {
    console.error("Resume upload failed", error);
  }

  await insertLead("career_applications", "career", {
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
    resume_path: String(upload.key || `careers/${storedName}`),
    resume_url: String(upload.url || ""),
    source_path: stringValue(form.get("sourcePath"), 255) || "/careers",
    ip_address: clientIp(req),
    user_agent: userAgent(req),
  });
  return ok(req, { message: "Application received." }, 201);
}

function blobFromBase64(value: unknown, mimeType: string) {
  const base64 = stringValue(value, 8 * 1024 * 1024);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

async function handleCareerJson(req: Request) {
  const body = await readJson(req);
  if (stringValue(body.company_website)) return ok(req, { message: "Application received." }, 201);

  const fieldErrors: Record<string, string> = {};
  const jobTitle = stringValue(body.jobTitle, 255);
  const name = stringValue(body.name, 160);
  const email = emailValue(body.email);
  const coverLetter = stringValue(body.coverLetter, 5000);
  const resumeName = stringValue(body.resumeName, 255);
  const resumeMimeType = stringValue(body.resumeMimeType, 120);
  const resumeSize = Number(body.resumeSize || 0);

  if (!jobTitle) fieldErrors.jobTitle = "Job title is required.";
  if (!name) fieldErrors.name = "Name is required.";
  if (!email) fieldErrors.email = "Valid email is required.";
  if (coverLetter.length < 30) fieldErrors.coverLetter = "Cover letter is too short.";
  if (!resumeName || !body.resumeBase64 || resumeSize <= 0) fieldErrors.cv = "Resume file is required.";
  if (resumeSize > 5 * 1024 * 1024) fieldErrors.cv = "Resume must be under 5 MB.";
  if (Object.keys(fieldErrors).length) throw new ApiError("Please correct the highlighted fields.", 422, fieldErrors);

  await checkRateLimit(req, `careers:${clientIp(req)}`, 5);
  const ext = resumeName.split(".").pop()?.toLowerCase() || "bin";
  const storedName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const resumeBlob = blobFromBase64(body.resumeBase64, resumeMimeType);
  let upload: JsonRecord = {};
  try {
    upload = await uploadResume(resumeBlob, storedName);
  } catch (error) {
    console.error("Resume upload failed", error);
  }

  await insertLead("career_applications", "career", {
    job_title: jobTitle,
    name,
    email,
    linkedin: stringValue(body.linkedin, 512),
    portfolio: stringValue(body.portfolio, 512),
    cover_letter: coverLetter,
    resume_original_name: resumeName,
    resume_stored_file_name: storedName,
    resume_mime_type: resumeMimeType,
    resume_size: resumeSize,
    resume_path: String(upload.key || `careers/${storedName}`),
    resume_url: String(upload.url || ""),
    source_path: stringValue(body.sourcePath, 255) || "/careers",
    ip_address: clientIp(req),
    user_agent: userAgent(req),
  });
  return ok(req, { message: "Application received." }, 201);
}

type PortalProfile = {
  id: number;
  auth_user_id: string;
  email: string;
  name: string;
  role: "company_admin" | "company_member" | "client";
  status: string;
  client_id?: number | null;
};

const portalResources: Record<string, { table: string; fields: string[]; adminOnly?: boolean }> = {
  profiles: {
    table: "crm_profiles",
    adminOnly: true,
    fields: ["auth_user_id", "email", "name", "role", "status", "client_id"],
  },
  leads: {
    table: "crm_leads",
    fields: ["name", "email", "company", "service", "budget", "message", "source_path", "status", "priority", "assigned_to", "client_id", "next_followup_at", "marketing_opt_in"],
  },
  clients: {
    table: "crm_clients",
    fields: ["name", "company", "email", "phone", "status", "marketing_opt_in", "owner_user_id"],
  },
  projects: {
    table: "crm_projects",
    fields: [
      "client_id",
      "external_project_id",
      "name",
      "client_name",
      "project_manager",
      "status",
      "health",
      "priority",
      "progress",
      "budget",
      "expenses",
      "revenue",
      "profit",
      "team_members",
      "notes",
      "summary",
      "start_date",
      "due_date",
      "owner_user_id",
    ],
  },
  finances: {
    table: "crm_finance_transactions",
    fields: [
      "transaction_date",
      "transaction_type",
      "reference_id",
      "title",
      "client",
      "project",
      "paid_by",
      "received_by",
      "payment_method",
      "department",
      "region",
      "quarter",
      "status",
      "amount",
      "notes",
      "source",
      "source_ref",
    ],
  },
  deals: {
    table: "crm_deals",
    fields: ["client_id", "lead_id", "title", "stage", "value", "currency", "expected_close_date", "owner_user_id"],
  },
  tickets: {
    table: "crm_support_tickets",
    fields: ["client_id", "project_id", "subject", "description", "status", "priority", "created_by_user_id", "assigned_to"],
  },
  followups: {
    table: "crm_followups",
    fields: ["related_type", "related_id", "title", "due_at", "status", "assigned_to", "notes"],
  },
  invoices: {
    table: "crm_invoices",
    fields: [
      "client_id",
      "project_id",
      "invoice_number",
      "amount",
      "currency",
      "status",
      "invoice_date",
      "due_date",
      "customer_name",
      "customer_company",
      "customer_email",
      "customer_phone",
      "billing_address",
      "print_date",
      "service_title",
      "reference_number",
      "subtotal",
      "tax_amount",
      "discount_amount",
      "total_amount",
      "terms",
      "payment_instructions",
      "notes",
      "file_url",
      "sent_at",
      "viewed_at",
      "paid_at",
    ],
  },
  invoice_items: {
    table: "crm_invoice_items",
    fields: ["invoice_id", "description", "quantity", "rate", "amount", "sort_order"],
  },
  invoice_events: {
    table: "crm_invoice_events",
    fields: ["invoice_id", "actor_user_id", "actor_name", "action", "summary"],
  },
  ticket_messages: {
    table: "crm_ticket_messages",
    fields: ["ticket_id", "author_user_id", "author_name", "author_role", "body", "visibility"],
  },
  notes: {
    table: "crm_notes",
    fields: ["related_type", "related_id", "body", "created_by_user_id", "visibility"],
  },
  campaigns: {
    table: "crm_campaigns",
    fields: ["name", "subject", "body", "status", "msg91_template_id", "scheduled_at", "sent_at", "created_by_user_id"],
  },
  recipients: {
    table: "crm_campaign_recipients",
    fields: ["campaign_id", "client_id", "lead_id", "email", "name", "marketing_opt_in", "status", "sent_at", "error"],
  },
  activities: {
    table: "crm_team_activities",
    fields: ["actor_user_id", "actor_name", "action", "entity_type", "entity_id", "summary"],
  },
};

function bearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

async function getAuthenticatedUser(req: Request) {
  const token = bearerToken(req);
  if (!token) throw new ApiError("Authentication required.", 401);
  if (token === SIMPLE_ADMIN_TOKEN) {
    return {
      id: SIMPLE_ADMIN_TOKEN,
      email: "vinay@techmigos.local",
      name: "Vinay",
      simple_username: SIMPLE_ADMIN_USERNAME,
    };
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/sessions/current`, {
    headers: { "Authorization": `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.user) throw new ApiError("Invalid or expired session.", 401);
  return data.user as JsonRecord;
}

async function createAuthUser(email: string, password: string, name: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/users?client_type=server`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.user?.id) {
    throw new ApiError(data?.message || data?.error || "Could not create portal auth user.", response.status || 400);
  }
  return stringValue(data.user.id, 255);
}

async function getPortalProfile(req: Request, allowedRoles?: PortalProfile["role"][]) {
  const user = await getAuthenticatedUser(req);
  const authUser = user as JsonRecord;
  const userId = stringValue(authUser.id || authUser.sub, 255);
  const email = emailValue(user.email);
  if (!userId && !email) throw new ApiError("Authenticated user is missing an id/email.", 401);

  if (userId === SIMPLE_ADMIN_TOKEN) {
    const profile: PortalProfile = {
      id: 0,
      auth_user_id: SIMPLE_ADMIN_TOKEN,
      email: "vinay@techmigos.local",
      name: "Vinay",
      role: "company_admin",
      status: "active",
      client_id: null,
    };
    if (allowedRoles && !allowedRoles.includes(profile.role)) throw new ApiError("You do not have access to this portal area.", 403);
    return { user, profile };
  }

  let rows = userId
    ? await listRecords("crm_profiles", `auth_user_id=eq.${encodeURIComponent(userId)}&limit=1`)
    : [];
  if (!rows[0] && email) {
    rows = await listRecords("crm_profiles", `email=eq.${encodeURIComponent(email)}&limit=1`);
  }

  const profile = rows[0] as PortalProfile | undefined;
  if (!profile) throw new ApiError("Portal access has not been provisioned for this account.", 403);
  if (profile.status !== "active") throw new ApiError("This portal account is disabled.", 403);
  if (allowedRoles && !allowedRoles.includes(profile.role)) throw new ApiError("You do not have access to this portal area.", 403);

  if (userId && profile.auth_user_id !== userId) {
    await updateRecord("crm_profiles", profile.id, { auth_user_id: userId, updated_at: new Date().toISOString() });
    profile.auth_user_id = userId;
  }

  return { user, profile };
}

function isCompanyRole(profile: PortalProfile) {
  return profile.role === "company_admin" || profile.role === "company_member";
}

function sanitizeBody(body: JsonRecord, fields: string[]) {
  const row: JsonRecord = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) row[field] = body[field];
  }
  return row;
}

function hasUpdatedAt(resource: string) {
  return !["notes", "recipients", "activities", "invoice_items", "invoice_events", "ticket_messages"].includes(resource);
}

async function recordActivity(profile: PortalProfile, action: string, entityType: string, entityId: unknown, summary: string) {
  await insertRecord("crm_team_activities", {
    actor_user_id: profile.auth_user_id,
    actor_name: profile.name,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    summary,
  });
}

function resourceQuery(url: URL) {
  const query = new URLSearchParams();
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 250);
  query.set("order", url.searchParams.get("order") || "created_at.desc");
  query.set("limit", String(limit));
  for (const key of ["id", "client_id", "lead_id", "project_id", "campaign_id", "invoice_id", "ticket_id", "status", "email", "role"]) {
    const value = url.searchParams.get(key);
    if (value) query.set(key, value.includes(".") ? value : `eq.${value}`);
  }
  return query.toString();
}

async function invoiceSettings() {
  const rows = await listRecords("crm_invoice_settings", "order=id.asc&limit=1");
  if (rows[0]) return rows[0];
  return {
    prefix: "TMG",
    starting_number: 1,
    tax_label: "Tax",
    tax_rate: 0,
    default_terms: "Payment is due by the listed due date unless otherwise agreed in writing.",
    default_payment_instructions: "Please use the payment instructions shared by TechMigos for this project.",
  };
}

async function nextInvoiceNumber() {
  const settings = await invoiceSettings();
  const prefix = stringValue(settings.prefix, 16) || "TMG";
  const year = new Date().getFullYear();
  const existing = await listRecords("crm_invoices", `invoice_number=like.${encodeURIComponent(`${prefix}-${year}-%`)}&order=invoice_number.desc&limit=1`);
  const last = stringValue(existing[0]?.invoice_number, 80);
  const lastNumber = Number(last.match(/(\d+)$/)?.[1] || 0);
  const start = numberValue(settings.starting_number, 1);
  const next = Math.max(lastNumber + 1, start);
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}

function normalizeLineItems(value: unknown) {
  const source = Array.isArray(value) ? value : [];
  const items = source
    .map((item, index) => {
      const row = (item || {}) as JsonRecord;
      const description = stringValue(row.description, 500);
      const quantity = Math.max(numberValue(row.quantity, 1), 0);
      const rate = Math.max(numberValue(row.rate, 0), 0);
      const amount = Math.round(quantity * rate * 100) / 100;
      return { description, quantity, rate, amount, sort_order: index };
    })
    .filter((item) => item.description && item.amount >= 0);
  if (!items.length) throw new ApiError("At least one invoice line item is required.", 422);
  return items;
}

function invoiceTotals(items: JsonRecord[], body: JsonRecord, settings: JsonRecord) {
  const subtotal = Math.round(items.reduce((sum, item) => sum + numberValue(item.amount), 0) * 100) / 100;
  const discountAmount = Math.max(numberValue(body.discount_amount, 0), 0);
  const defaultTaxRate = numberValue(settings.tax_rate, 0);
  const taxRate = numberValue(body.tax_rate, defaultTaxRate);
  const manualTax = body.tax_amount !== undefined && body.tax_amount !== "";
  const taxable = Math.max(subtotal - discountAmount, 0);
  const taxAmount = manualTax ? Math.max(numberValue(body.tax_amount, 0), 0) : Math.round(taxable * taxRate) / 100;
  const totalAmount = Math.max(Math.round((subtotal - discountAmount + taxAmount) * 100) / 100, 0);
  return { subtotal, discountAmount, taxAmount, totalAmount };
}

async function invoiceDetail(id: unknown, clientId?: unknown) {
  const invoice = await getRecordById("crm_invoices", id);
  if (!invoice) throw new ApiError("Invoice not found.", 404);
  if (clientId && String(invoice.client_id) !== String(clientId)) throw new ApiError("Invoice not found.", 404);

  const invoiceId = encodeURIComponent(String(invoice.id));
  const [client, project, items, events] = await Promise.all([
    getRecordById("crm_clients", invoice.client_id),
    invoice.project_id ? getRecordById("crm_projects", invoice.project_id) : Promise.resolve(null),
    listRecords("crm_invoice_items", `invoice_id=eq.${invoiceId}&order=sort_order.asc&limit=100`),
    listRecords("crm_invoice_events", `invoice_id=eq.${invoiceId}&order=created_at.desc&limit=100`),
  ]);
  return { invoice, client, project, items, events };
}

async function recordInvoiceEvent(profile: PortalProfile | null, invoiceId: unknown, action: string, summary: string) {
  await insertRecord("crm_invoice_events", {
    invoice_id: Number(invoiceId),
    actor_user_id: profile?.auth_user_id || null,
    actor_name: profile?.name || "Client",
    action,
    summary,
  });
}

async function handlePortalMe(req: Request) {
  const { user, profile } = await getPortalProfile(req);
  const authUser = user as JsonRecord;
  return ok(req, {
    user: {
      id: authUser.id || authUser.sub,
      email: authUser.email,
    },
    profile,
    destination: isCompanyRole(profile) ? "/company" : "/client",
  });
}

async function handleSimplePortalLogin(req: Request) {
  const body = await readJson(req);
  const username = stringValue(body.username || body.email, 120).trim().toLowerCase();
  const password = stringValue(body.password, 255).trim();
  if (username !== SIMPLE_ADMIN_USERNAME.toLowerCase() || password !== SIMPLE_ADMIN_PASSWORD) {
    throw new ApiError("Username or password is incorrect.", 401);
  }
  return ok(req, {
    accessToken: SIMPLE_ADMIN_TOKEN,
    user: {
      id: SIMPLE_ADMIN_TOKEN,
      email: "vinay@techmigos.local",
      name: "Vinay",
    },
    profile: {
      name: "Vinay",
      role: "company_admin",
      status: "active",
    },
    destination: "/company",
  });
}

async function handleDashboard(req: Request) {
  await getPortalProfile(req, ["company_admin", "company_member"]);
  const [leads, clients, projects, deals, tickets, invoices, followups, activities, finances] = await Promise.all([
    listRecords("crm_leads", "order=created_at.desc&limit=250"),
    listRecords("crm_clients", "order=created_at.desc&limit=250"),
    listRecords("crm_projects", "order=created_at.desc&limit=250"),
    listRecords("crm_deals", "order=created_at.desc&limit=250"),
    listRecords("crm_support_tickets", "order=created_at.desc&limit=250"),
    listRecords("crm_invoices", "order=created_at.desc&limit=250"),
    listRecords("crm_followups", "order=due_at.asc&limit=250"),
    listRecords("crm_team_activities", "order=created_at.desc&limit=20"),
    listRecords("crm_finance_transactions", "order=transaction_date.desc&limit=500"),
  ]);

  const openTickets = tickets.filter((ticket) => !["resolved", "closed"].includes(stringValue(ticket.status)));
  const openInvoices = invoices.filter((invoice) => !["paid", "void", "cancelled"].includes(stringValue(invoice.status)));
  const pipelineValue = deals
    .filter((deal) => !["won", "lost"].includes(stringValue(deal.stage)))
    .reduce((sum, deal) => sum + numberValue(deal.value), 0);
  const invoiceOutstanding = openInvoices.reduce((sum, invoice) => sum + numberValue(invoice.total_amount || invoice.amount), 0);
  const financeIncome = finances
    .filter((item) => ["income", "revenue"].includes(stringValue(item.transaction_type)))
    .reduce((sum, item) => sum + numberValue(item.amount), 0);
  const financeExpenses = finances
    .filter((item) => ["expense", "salary"].includes(stringValue(item.transaction_type)))
    .reduce((sum, item) => sum + numberValue(item.amount), 0);
  const financeByType = finances.reduce((acc, item) => {
    const type = stringValue(item.transaction_type) || "other";
    acc[type] = (acc[type] || 0) + numberValue(item.amount);
    return acc;
  }, {} as Record<string, number>);
  const today = todayIsoDate();

  return ok(req, {
    metrics: {
      leads: leads.length,
      qualifiedLeads: leads.filter((lead) => ["qualified", "proposal"].includes(stringValue(lead.status))).length,
      clients: clients.length,
      activeProjects: projects.filter((project) => stringValue(project.status) === "active").length,
      openTickets: openTickets.length,
      overdueInvoices: invoices.filter((invoice) => stringValue(invoice.status) !== "paid" && stringValue(invoice.due_date) && stringValue(invoice.due_date) < today).length,
      pipelineValue,
      invoiceOutstanding,
      financeIncome,
      financeExpenses,
      financeProfit: financeIncome - financeExpenses,
    },
    finance: {
      byType: financeByType,
      recent: finances.slice(0, 12),
      projects: projects
        .map((project) => ({
          id: project.id,
          name: project.name,
          budget: numberValue(project.budget),
          expenses: numberValue(project.expenses),
          revenue: numberValue(project.revenue),
          profit: numberValue(project.profit || numberValue(project.revenue) - numberValue(project.expenses)),
          progress: numberValue(project.progress),
          status: project.status,
        }))
        .slice(0, 12),
    },
    recentLeads: leads.slice(0, 8),
    urgentTickets: openTickets.filter((ticket) => ["high", "urgent"].includes(stringValue(ticket.priority))).slice(0, 8),
    dueFollowups: followups.filter((followup) => stringValue(followup.status) === "pending").slice(0, 8),
    openInvoices: openInvoices.slice(0, 8),
    activities,
  });
}

async function handleNextInvoiceNumber(req: Request) {
  await getPortalProfile(req, ["company_admin", "company_member"]);
  return ok(req, { invoice_number: await nextInvoiceNumber(), settings: await invoiceSettings() });
}

async function handleCreateInvoice(req: Request) {
  const { profile } = await getPortalProfile(req, ["company_admin", "company_member"]);
  const body = await readJson(req);
  const clientId = Number(body.client_id);
  if (!clientId) throw new ApiError("Client is required for an invoice.", 422);
  const client = await getRecordById("crm_clients", clientId);
  if (!client) throw new ApiError("Client not found.", 404);

  const settings = await invoiceSettings();
  const items = normalizeLineItems(body.items);
  const totals = invoiceTotals(items, body, settings);
  const invoiceNumber = stringValue(body.invoice_number, 80) || await nextInvoiceNumber();
  const created = await insertRecord("crm_invoices", {
    client_id: clientId,
    project_id: body.project_id || null,
    invoice_number: invoiceNumber,
    amount: totals.totalAmount,
    currency: stringValue(body.currency, 12) || "INR",
    status: stringValue(body.status, 40) || "draft",
    invoice_date: stringValue(body.invoice_date, 20) || todayIsoDate(),
    due_date: stringValue(body.due_date, 20) || null,
    customer_name: stringValue(body.customer_name || client.name, 180),
    customer_company: stringValue(body.customer_company || client.company, 180),
    customer_email: emailValue(body.customer_email) || emailValue(client.email),
    customer_phone: stringValue(body.customer_phone || client.phone, 80),
    billing_address: stringValue(body.billing_address, 1000),
    print_date: stringValue(body.print_date, 20) || todayIsoDate(),
    service_title: stringValue(body.service_title || body.invoice_title, 180),
    reference_number: stringValue(body.reference_number, 120),
    subtotal: totals.subtotal,
    tax_amount: totals.taxAmount,
    discount_amount: totals.discountAmount,
    total_amount: totals.totalAmount,
    terms: stringValue(body.terms || settings.default_terms, 3000),
    payment_instructions: stringValue(body.payment_instructions || settings.default_payment_instructions, 3000),
    notes: stringValue(body.notes, 3000),
    file_url: stringValue(body.file_url, 500),
    created_at: new Date().toISOString(),
  });

  for (const item of items) {
    await insertRecord("crm_invoice_items", { ...item, invoice_id: created?.id });
  }
  await recordInvoiceEvent(profile, created?.id, "created", `Created invoice ${invoiceNumber}`);
  await recordActivity(profile, "created", "invoices", created?.id, `Created invoice ${invoiceNumber}`);
  return ok(req, { item: (await invoiceDetail(created?.id)).invoice, detail: await invoiceDetail(created?.id) }, 201);
}

async function handleInvoiceDetail(req: Request, id: string) {
  await getPortalProfile(req, ["company_admin", "company_member"]);
  return ok(req, { detail: await invoiceDetail(id) });
}

async function handleInvoiceSend(req: Request, id: string) {
  const { profile } = await getPortalProfile(req, ["company_admin", "company_member"]);
  const detail = await invoiceDetail(id);
  const clientEmail = emailValue(detail.client?.email);
  const templateId = stringValue(MSG91_INVOICE_TEMPLATE_ID, 255);
  if (!MSG91_AUTH_KEY || !templateId || !clientEmail) {
    return ok(req, {
      sent: false,
      message: "MSG91 invoice template/auth or client email is not configured yet. Invoice was not emailed.",
    });
  }

  await postMsg91TemplateEmail(clientEmail, stringValue(detail.client?.name, 160) || clientEmail, templateId, {
    INVOICE_NUMBER: String(detail.invoice.invoice_number || ""),
    INVOICE_TOTAL: String(detail.invoice.total_amount || detail.invoice.amount || ""),
    INVOICE_CURRENCY: String(detail.invoice.currency || "INR"),
    INVOICE_DUE_DATE: String(detail.invoice.due_date || ""),
    CLIENT_NAME: String(detail.client?.name || "there"),
    PROJECT_NAME: String(detail.project?.name || ""),
  });

  await updateRecord("crm_invoices", id, {
    status: "sent",
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await recordInvoiceEvent(profile, id, "sent", `Sent invoice ${detail.invoice.invoice_number} to ${clientEmail}`);
  await recordActivity(profile, "sent", "invoices", id, `Sent invoice ${detail.invoice.invoice_number}`);
  return ok(req, { sent: true, detail: await invoiceDetail(id) });
}

async function handleTicketMessages(req: Request, id: string) {
  const { profile } = await getPortalProfile(req, ["company_admin", "company_member"]);
  const ticket = await getRecordById("crm_support_tickets", id);
  if (!ticket) throw new ApiError("Ticket not found.", 404);

  if (req.method === "GET") {
    return ok(req, { messages: await listRecords("crm_ticket_messages", `ticket_id=eq.${encodeURIComponent(id)}&order=created_at.asc&limit=100`) });
  }

  if (req.method === "POST") {
    const body = await readJson(req);
    const message = await insertRecord("crm_ticket_messages", {
      ticket_id: Number(id),
      author_user_id: profile.auth_user_id,
      author_name: profile.name,
      author_role: "company",
      body: stringValue(body.body, 5000),
      visibility: "shared",
    });
    await updateRecord("crm_support_tickets", id, { updated_at: new Date().toISOString() });
    await recordActivity(profile, "replied", "tickets", id, `Replied to ticket ${ticket.subject || id}`);
    return ok(req, { message }, 201);
  }

  throw new ApiError("Unsupported ticket message operation.", 405);
}

async function handleCompanyResource(req: Request, resource: string, id?: string) {
  const { profile } = await getPortalProfile(req, ["company_admin", "company_member"]);
  const config = portalResources[resource];
  if (!config) throw new ApiError("Unknown CRM resource.", 404);
  if (config.adminOnly && profile.role !== "company_admin") throw new ApiError("Only company admins can manage this resource.", 403);

  const url = new URL(req.url);
  if (req.method === "GET") {
    if (id) return ok(req, { item: await getRecordById(config.table, id) });
    return ok(req, { items: await listRecords(config.table, resourceQuery(url)) });
  }

  if (req.method === "POST") {
    if (resource === "invoices") return await handleCreateInvoice(req);
    const body = await readJson(req);
    const row = sanitizeBody(body, config.fields);
    if (resource === "profiles" && row.email && body.temporary_password && !row.auth_user_id) {
      row.auth_user_id = await createAuthUser(String(row.email), stringValue(body.temporary_password, 255), stringValue(row.name || row.email, 160));
    }
    row.created_at = new Date().toISOString();
    if (resource === "tickets" && !row.created_by_user_id) row.created_by_user_id = profile.auth_user_id;
    if (resource === "campaigns" && !row.created_by_user_id) row.created_by_user_id = profile.auth_user_id;
    const created = await insertRecord(config.table, row);
    await recordActivity(profile, "created", resource, created?.id, `Created ${resource.slice(0, -1) || resource}`);
    return ok(req, { item: created }, 201);
  }

  if (req.method === "PATCH" && id) {
    const body = await readJson(req);
    const row = sanitizeBody(body, config.fields);
    if (hasUpdatedAt(resource)) row.updated_at = new Date().toISOString();
    await updateRecord(config.table, id, row);
    await recordActivity(profile, "updated", resource, id, `Updated ${resource.slice(0, -1) || resource}`);
    return ok(req, { item: await getRecordById(config.table, id) });
  }

  if (req.method === "DELETE" && id) {
    await insforge(`/api/database/records/${config.table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    await recordActivity(profile, "deleted", resource, id, `Deleted ${resource.slice(0, -1) || resource}`);
    return ok(req, { success: true });
  }

  throw new ApiError("Unsupported CRM operation.", 405);
}

async function handleLeadConvert(req: Request, id: string) {
  const { profile } = await getPortalProfile(req, ["company_admin", "company_member"]);
  const body = await readJson(req);
  const lead = await getRecordById("crm_leads", id);
  if (!lead) throw new ApiError("Lead not found.", 404);

  const client = await insertRecord("crm_clients", {
    name: stringValue(body.clientName || lead.name, 160),
    company: stringValue(body.company || lead.company, 255),
    email: emailValue(body.email || lead.email),
    phone: stringValue(body.phone, 80),
    status: "active",
    marketing_opt_in: Boolean(body.marketing_opt_in || lead.marketing_opt_in),
    owner_user_id: profile.auth_user_id,
  });

  let project: JsonRecord | null = null;
  if (stringValue(body.projectName || lead.service)) {
    project = await insertRecord("crm_projects", {
      client_id: client?.id,
      name: stringValue(body.projectName || lead.service, 255),
      status: "planning",
      health: "on_track",
      progress: 0,
      summary: stringValue(body.projectSummary || lead.message, 2000),
      owner_user_id: profile.auth_user_id,
    });
  }

  await updateRecord("crm_leads", id, {
    status: "converted",
    client_id: client?.id,
    updated_at: new Date().toISOString(),
  });
  await recordActivity(profile, "converted", "leads", id, `Converted lead ${lead.email || id} to client`);
  return ok(req, { client, project });
}

async function handleClientInvite(req: Request, id: string) {
  const { profile } = await getPortalProfile(req, ["company_admin"]);
  const client = await getRecordById("crm_clients", id);
  if (!client) throw new ApiError("Client not found.", 404);
  const body = await readJson(req);
  const email = emailValue(body.email || client.email);
  const name = stringValue(body.name || client.name || email, 160);
  const password = stringValue(body.password, 255);
  if (!email || !password) throw new ApiError("Client email and temporary password are required.", 422);

  const existing = await listRecords("crm_profiles", `email=eq.${encodeURIComponent(email)}&limit=1`);
  if (existing[0]) {
    await updateRecord("crm_profiles", existing[0].id, {
      name,
      role: "client",
      status: "active",
      client_id: Number(id),
      updated_at: new Date().toISOString(),
    });
    await recordActivity(profile, "updated", "profiles", existing[0].id, `Linked client portal account for ${email}`);
    return ok(req, { profile: await getRecordById("crm_profiles", existing[0].id), createdAuthUser: false });
  }

  const authUserId = await createAuthUser(email, password, name);
  const created = await insertRecord("crm_profiles", {
    auth_user_id: authUserId,
    email,
    name,
    role: "client",
    status: "active",
    client_id: Number(id),
    created_at: new Date().toISOString(),
  });
  await recordActivity(profile, "created", "profiles", created?.id, `Created client portal account for ${email}`);
  return ok(req, { profile: created, createdAuthUser: true }, 201);
}

async function ensureCampaignRecipients(campaignId: string) {
  const existing = await listRecords("crm_campaign_recipients", `campaign_id=eq.${encodeURIComponent(campaignId)}&limit=250`);
  if (existing.length) return existing;

  const [clients, leads] = await Promise.all([
    listRecords("crm_clients", "marketing_opt_in=eq.true&limit=250"),
    listRecords("crm_leads", "marketing_opt_in=eq.true&limit=250"),
  ]);
  const seen = new Set<string>();
  const recipients: JsonRecord[] = [];
  for (const client of clients) {
    const email = emailValue(client.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push(await insertRecord("crm_campaign_recipients", {
      campaign_id: Number(campaignId),
      client_id: client.id,
      email,
      name: stringValue(client.name, 160),
      marketing_opt_in: true,
      status: "queued",
    }));
  }
  for (const lead of leads) {
    const email = emailValue(lead.email);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    recipients.push(await insertRecord("crm_campaign_recipients", {
      campaign_id: Number(campaignId),
      lead_id: lead.id,
      email,
      name: stringValue(lead.name, 160),
      marketing_opt_in: true,
      status: "queued",
    }));
  }
  return recipients;
}

async function handleCampaignSend(req: Request, id: string) {
  const { profile } = await getPortalProfile(req, ["company_admin", "company_member"]);
  const campaign = await getRecordById("crm_campaigns", id);
  if (!campaign) throw new ApiError("Campaign not found.", 404);

  const templateId = stringValue(campaign.msg91_template_id || MSG91_MARKETING_TEMPLATE_ID, 255);
  const recipients = await ensureCampaignRecipients(id);
  const optedIn = recipients.filter((item) => item.marketing_opt_in && emailValue(item.email));
  if (!templateId || !MSG91_AUTH_KEY) {
    await updateRecord("crm_campaigns", id, { status: "template_pending", updated_at: new Date().toISOString() });
    return ok(req, {
      sent: 0,
      skipped: optedIn.length,
      message: "MSG91 marketing template/auth is not configured yet. Campaign was not sent.",
    });
  }

  let sent = 0;
  for (const recipient of optedIn) {
    try {
      await postMsg91TemplateEmail(emailValue(recipient.email), stringValue(recipient.name, 160), templateId, {
        CAMPAIGN_SUBJECT: String(campaign.subject || ""),
        CAMPAIGN_BODY: String(campaign.body || ""),
        RECIPIENT_NAME: String(recipient.name || "there"),
        RECIPIENT_EMAIL: String(recipient.email || ""),
      });
      await updateRecord("crm_campaign_recipients", recipient.id, {
        status: "sent",
        sent_at: new Date().toISOString(),
        error: null,
      });
      sent += 1;
    } catch (error) {
      await updateRecord("crm_campaign_recipients", recipient.id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Send failed",
      });
    }
  }

  await updateRecord("crm_campaigns", id, {
    status: sent > 0 ? "sent" : "failed",
    sent_at: sent > 0 ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  await recordActivity(profile, "sent", "campaigns", id, `Sent campaign to ${sent} opted-in recipients`);
  return ok(req, { sent, skipped: recipients.length - optedIn.length });
}

async function handleClientOverview(req: Request) {
  const { profile } = await getPortalProfile(req, ["client"]);
  if (!profile.client_id) throw new ApiError("This client account is not linked to a client record.", 403);
  const clientId = encodeURIComponent(String(profile.client_id));
  const [client, projects, invoices, tickets] = await Promise.all([
    getRecordById("crm_clients", profile.client_id),
    listRecords("crm_projects", `client_id=eq.${clientId}&order=created_at.desc&limit=100`),
    listRecords("crm_invoices", `client_id=eq.${clientId}&order=created_at.desc&limit=100`),
    listRecords("crm_support_tickets", `client_id=eq.${clientId}&order=created_at.desc&limit=100`),
  ]);
  return ok(req, { client, projects, invoices, tickets });
}

async function handleClientInvoiceDetail(req: Request, id: string) {
  const { profile } = await getPortalProfile(req, ["client"]);
  if (!profile.client_id) throw new ApiError("This client account is not linked to a client record.", 403);
  const detail = await invoiceDetail(id, profile.client_id);
  if (!detail.invoice.viewed_at && stringValue(detail.invoice.status) === "sent") {
    await updateRecord("crm_invoices", id, { status: "viewed", viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    await recordInvoiceEvent(null, id, "viewed", `Client viewed invoice ${detail.invoice.invoice_number}`);
    return ok(req, { detail: await invoiceDetail(id, profile.client_id) });
  }
  return ok(req, { detail });
}

async function handleClientTicket(req: Request) {
  const { profile } = await getPortalProfile(req, ["client"]);
  if (!profile.client_id) throw new ApiError("This client account is not linked to a client record.", 403);
  const body = await readJson(req);
  const subject = stringValue(body.subject, 255);
  const description = stringValue(body.description, 5000);
  if (!subject || !description) throw new ApiError("Subject and description are required.", 422);
  const ticket = await insertRecord("crm_support_tickets", {
    client_id: profile.client_id,
    project_id: body.project_id || null,
    subject,
    description,
    status: "open",
    priority: stringValue(body.priority, 40) || "medium",
    created_by_user_id: profile.auth_user_id,
  });
  await recordActivity(profile, "created", "tickets", ticket?.id, `Client opened support ticket: ${subject}`);
  return ok(req, { ticket }, 201);
}

async function handleClientTicketMessages(req: Request, id: string) {
  const { profile } = await getPortalProfile(req, ["client"]);
  if (!profile.client_id) throw new ApiError("This client account is not linked to a client record.", 403);
  const ticket = await getRecordById("crm_support_tickets", id);
  if (!ticket || String(ticket.client_id) !== String(profile.client_id)) throw new ApiError("Ticket not found.", 404);

  if (req.method === "GET") {
    return ok(req, { messages: await listRecords("crm_ticket_messages", `ticket_id=eq.${encodeURIComponent(id)}&order=created_at.asc&limit=100`) });
  }

  if (req.method === "POST") {
    const body = await readJson(req);
    const message = await insertRecord("crm_ticket_messages", {
      ticket_id: Number(id),
      author_user_id: profile.auth_user_id,
      author_name: profile.name,
      author_role: "client",
      body: stringValue(body.body, 5000),
      visibility: "shared",
    });
    await updateRecord("crm_support_tickets", id, { status: "open", updated_at: new Date().toISOString() });
    await recordActivity(profile, "replied", "tickets", id, `Client replied to ticket ${ticket.subject || id}`);
    return ok(req, { message }, 201);
  }

  throw new ApiError("Unsupported ticket message operation.", 405);
}

async function handleFinanceTransactions(req: Request, id?: string) {
  const { profile } = await getPortalProfile(req, ["company_admin", "company_member"]);
  const config = portalResources.finances;
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (id) return ok(req, { item: await getRecordById(config.table, id) });
    const type = url.searchParams.get("type");
    let query = resourceQuery(url);
    if (type) {
      const prefix = query ? "&" : "";
      query = `${query}${prefix}transaction_type=eq.${encodeURIComponent(type)}`;
    }
    return ok(req, { items: await listRecords(config.table, query) });
  }

  if (req.method === "POST") {
    const body = await readJson(req);
    const row = sanitizeBody(body, config.fields);
    row.created_at = new Date().toISOString();
    row.source = row.source || "manual";
    row.source_ref = row.source_ref || `${row.transaction_type}-${Date.now()}-${crypto.randomUUID()}`;
    const created = await insertRecord(config.table, row);
    await recordActivity(profile, "created", "finances", created?.id, `Created ${row.transaction_type} transaction`);
    return ok(req, { item: created }, 201);
  }

  if (req.method === "PATCH" && id) {
    const body = await readJson(req);
    const row = sanitizeBody(body, config.fields);
    row.updated_at = new Date().toISOString();
    await updateRecord(config.table, id, row);
    await recordActivity(profile, "updated", "finances", id, `Updated finance transaction`);
    return ok(req, { item: await getRecordById(config.table, id) });
  }

  if (req.method === "DELETE" && id) {
    await insforge(`/api/database/records/${config.table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    await recordActivity(profile, "deleted", "finances", id, `Deleted finance transaction`);
    return ok(req, { success: true });
  }

  throw new ApiError("Unsupported finance operation.", 405);
}

async function handleFinanceSummary(req: Request) {
  await getPortalProfile(req, ["company_admin", "company_member"]);
  const data = await insforge("/api/database/rpc/get_finance_summary");
  return ok(req, { summary: data });
}

async function handleProjectAnalytics(req: Request) {
  await getPortalProfile(req, ["company_admin", "company_member"]);
  const data = await insforge("/api/database/rpc/get_project_analytics");
  return ok(req, { analytics: data });
}

async function handlePersonAnalytics(req: Request) {
  await getPortalProfile(req, ["company_admin", "company_member"]);
  const data = await insforge("/api/database/rpc/get_person_analytics");
  return ok(req, { analytics: data });
}

async function handleFinanceImport(req: Request) {
  const { profile } = await getPortalProfile(req, ["company_admin"]);
  const body = await readJson(req);
  const { transactions } = body;
  
  if (!Array.isArray(transactions) || !transactions.length) {
    throw new ApiError("Transactions array is required.", 422);
  }

  const results = [];
  for (const txn of transactions) {
    const row = sanitizeBody(txn, portalResources.finances.fields);
    row.created_at = new Date().toISOString();
    row.source = row.source || "import";
    row.source_ref = row.source_ref || `${row.transaction_type}-${Date.now()}-${crypto.randomUUID()}`;
    const created = await insertRecord("crm_finance_transactions", row);
    results.push(created);
  }

  await recordActivity(profile, "imported", "finances", null, `Imported ${results.length} finance transactions`);
  return ok(req, { imported: results.length, items: results }, 201);
}

async function handleFinanceExport(req: Request) {
  await getPortalProfile(req, ["company_admin", "company_member"]);
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "all";
  const format = url.searchParams.get("format") || "json";

  let query = "order=transaction_date.desc";
  if (type !== "all") {
    query += `&transaction_type=eq.${encodeURIComponent(type)}`;
  }

  const items = await listRecords("crm_finance_transactions", query);

  if (format === "csv") {
    const headers = ["Date", "Type", "Reference ID", "Title", "Client", "Project", "Paid By", "Received By", "Payment Method", "Department", "Region", "Quarter", "Status", "Amount", "Notes"];
    const rows = items.map(item => [
      item.transaction_date || "",
      item.transaction_type || "",
      item.reference_id || "",
      item.title || "",
      item.client || "",
      item.project || "",
      item.paid_by || "",
      item.received_by || "",
      item.payment_method || "",
      item.department || "",
      item.region || "",
      item.quarter || "",
      item.status || "",
      item.amount || "",
      item.notes || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    return new Response(csv, {
      headers: {
        ...corsHeaders(req),
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="finance-${type}-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  }

  return ok(req, { items });
}

async function handlePortal(req: Request, route: string) {
  if (req.method === "POST" && route === "/api/portal/simple-login") return await handleSimplePortalLogin(req);
  if (req.method === "GET" && route === "/api/portal/me") return await handlePortalMe(req);
  if (req.method === "GET" && route === "/api/portal/dashboard") return await handleDashboard(req);
  if (req.method === "GET" && route === "/api/portal/invoices/next-number") return await handleNextInvoiceNumber(req);
  if (req.method === "GET" && route === "/api/portal/client/overview") return await handleClientOverview(req);
  if (req.method === "POST" && route === "/api/portal/client/tickets") return await handleClientTicket(req);
  if (req.method === "GET" && route === "/api/portal/finance/summary") return await handleFinanceSummary(req);
  if (req.method === "GET" && route === "/api/portal/finance/project-analytics") return await handleProjectAnalytics(req);
  if (req.method === "GET" && route === "/api/portal/finance/person-analytics") return await handlePersonAnalytics(req);
  if (req.method === "POST" && route === "/api/portal/finance/import") return await handleFinanceImport(req);
  if (req.method === "GET" && route === "/api/portal/finance/export") return await handleFinanceExport(req);

  const clientInvoiceMatch = route.match(/^\/api\/portal\/client\/invoices\/([^/]+)$/);
  if (req.method === "GET" && clientInvoiceMatch) return await handleClientInvoiceDetail(req, clientInvoiceMatch[1]);

  const clientTicketMessagesMatch = route.match(/^\/api\/portal\/client\/tickets\/([^/]+)\/messages$/);
  if ((req.method === "GET" || req.method === "POST") && clientTicketMessagesMatch) return await handleClientTicketMessages(req, clientTicketMessagesMatch[1]);

  const invoiceSendMatch = route.match(/^\/api\/portal\/invoices\/([^/]+)\/send$/);
  if (req.method === "POST" && invoiceSendMatch) return await handleInvoiceSend(req, invoiceSendMatch[1]);

  const invoiceDetailMatch = route.match(/^\/api\/portal\/invoices\/([^/]+)$/);
  if (req.method === "GET" && invoiceDetailMatch) return await handleInvoiceDetail(req, invoiceDetailMatch[1]);

  const ticketMessagesMatch = route.match(/^\/api\/portal\/tickets\/([^/]+)\/messages$/);
  if ((req.method === "GET" || req.method === "POST") && ticketMessagesMatch) return await handleTicketMessages(req, ticketMessagesMatch[1]);

  const convertMatch = route.match(/^\/api\/portal\/leads\/([^/]+)\/convert$/);
  if (req.method === "POST" && convertMatch) return await handleLeadConvert(req, convertMatch[1]);

  const clientInviteMatch = route.match(/^\/api\/portal\/clients\/([^/]+)\/invite$/);
  if (req.method === "POST" && clientInviteMatch) return await handleClientInvite(req, clientInviteMatch[1]);

  const campaignSendMatch = route.match(/^\/api\/portal\/campaigns\/([^/]+)\/send$/);
  if (req.method === "POST" && campaignSendMatch) return await handleCampaignSend(req, campaignSendMatch[1]);

  const financeMatch = route.match(/^\/api\/portal\/finance-transactions(?:\/([^/]+))?$/);
  if (financeMatch) return await handleFinanceTransactions(req, financeMatch[1]);

  const match = route.match(/^\/api\/portal\/([a-z_-]+)(?:\/([^/]+))?$/);
  if (!match) throw new ApiError("Unsupported portal route.", 404);
  return await handleCompanyResource(req, match[1], match[2]);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });

  try {
    const route = routeFor(req);
    if (req.method === "GET" && route === "/api/csrf") return await handleCsrf(req);
    if (req.method === "POST" && route === "/api/leads/contact") return await handleContact(req);
    if (req.method === "POST" && route === "/api/leads/newsletter") return await handleNewsletter(req);
    if (req.method === "POST" && route === "/api/leads/careers") return await handleCareer(req);
    if (route.startsWith("/api/portal/")) return await handlePortal(req, route);
    throw new ApiError("Unsupported API route.", 404);
  } catch (error) {
    return fail(req, error);
  }
}
