import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const defaultAllowedOrigins = [
  'https://www.techmigos.com',
  'https://techmigos.com',
  'http://127.0.0.1:4321',
  'http://localhost:4321',
];
const allowedOrigins = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') || defaultAllowedOrigins.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function corsHeaders(request: Request) {
  const requestOrigin = request.headers.get('Origin') || '';
  const origin = allowedOrigins.has(requestOrigin) ? requestOrigin : defaultAllowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? serviceRoleKey;
const siteUrl = (Deno.env.get('SITE_URL') || 'https://www.techmigos.com').replace(/\/$/, '');

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const authClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Admin user operation failed.';
}

function normalizedEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizedUsername(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function usernameBase(value: unknown) {
  const normalized = normalizedUsername(value)
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return normalized.length >= 3 ? normalized : 'user';
}

async function uniqueUsername(preferred: unknown, fallback: unknown) {
  const base = usernameBase(preferred || fallback);
  const { data, error } = await serviceClient
    .from('crm_profiles')
    .select('username')
    .ilike('username', `${base}%`)
    .limit(1000);
  if (error) throw new Error('Could not prepare a unique username.');

  const used = new Set((data || []).map((profile) => normalizedUsername(profile.username)));
  if (!used.has(base)) return base;
  for (let suffix = 2; suffix < 10000; suffix += 1) {
    const suffixText = `-${suffix}`;
    const candidate = `${base.slice(0, 64 - suffixText.length)}${suffixText}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error('Could not generate a unique username.');
}

function validUsername(value: unknown) {
  return /^[a-z0-9][a-z0-9._-]{2,63}$/.test(normalizedUsername(value));
}

function validInitialPassword(value: unknown) {
  const password = String(value ?? '');
  return password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function validRole(value: unknown): value is 'company_admin' | 'company_member' | 'client' {
  return ['company_admin', 'company_member', 'client'].includes(String(value));
}

function validStatus(value: unknown): value is 'active' | 'inactive' | 'pending' {
  return ['active', 'inactive', 'pending'].includes(String(value));
}

async function requireClientLink(role: unknown, clientId: number | null) {
  if (role !== 'client') return null;
  if (!clientId || !Number.isInteger(clientId)) throw new Error('A client link is required for client users.');
  const { data, error } = await serviceClient.from('crm_clients').select('id').eq('id', clientId).maybeSingle();
  if (error || !data) throw new Error('The selected CRM client does not exist.');
  return clientId;
}

function parsedClientId(value: unknown) {
  if (value === '' || value == null) return null;
  const clientId = Number(value);
  return Number.isSafeInteger(clientId) && clientId > 0 ? clientId : Number.NaN;
}

async function requireAdmin(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: corsHeaders(request) });

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: corsHeaders(request) });
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('crm_profiles')
    .select('id, auth_user_id, role, status')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'company_admin' || profile.status !== 'active') {
    throw new Response(JSON.stringify({ error: 'Only active company admins can manage users.' }), { status: 403, headers: corsHeaders(request) });
  }

  return { user: authData.user, profile };
}

async function requireAuthenticatedUser(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: corsHeaders(request) });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: corsHeaders(request) });
  return data.user;
}

async function inviteUser(body: Record<string, unknown>) {
  const email = normalizedEmail(body.email);
  const name = String(body.name ?? '').trim();
  const username = await uniqueUsername(body.username, email.split('@')[0] || name);
  const role = body.role;
  // An invited user must complete the first-login password flow before the
  // CRM account becomes active. The caller cannot bypass that transition.
  const status = 'pending';
  const requestedClientId = parsedClientId(body.client_id);
  const clientId = role === 'client' ? requestedClientId : null;

  if (!email || !email.includes('@')) throw new Error('A valid email address is required.');
  if (!validUsername(username)) throw new Error('Username must be 3–64 lowercase letters, numbers, dots, underscores, or hyphens.');
  if (!name) throw new Error('Full name is required.');
  if (!validRole(role)) throw new Error('Choose a valid CRM role.');
  await requireClientLink(role, clientId);

  const { data: invited, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { name, crm_role: role },
    redirectTo: `${siteUrl}/change-password`,
  });
  if (inviteError || !invited.user) throw new Error(inviteError?.message || 'Could not invite Auth user.');

  const { data: profile, error: profileError } = await serviceClient
    .from('crm_profiles')
    .insert({
      auth_user_id: invited.user.id,
      email,
      username,
      name,
      role,
      status,
      must_change_password: true,
      client_id: clientId,
      department: String(body.department ?? '').trim(),
    })
    .select('id, auth_user_id, email, username, name, role, status, must_change_password, client_id, department')
    .single();

  if (profileError || !profile) {
    await serviceClient.auth.admin.deleteUser(invited.user.id);
    throw new Error(profileError?.message || 'Could not create CRM profile.');
  }

  return { profile };
}

async function provisionUser(body: Record<string, unknown>) {
  const email = normalizedEmail(body.email);
  const name = String(body.name ?? '').trim();
  const username = await uniqueUsername(body.username, email.split('@')[0] || name);
  const role = body.role;
  const department = String(body.department ?? '').trim();
  const requestedClientId = parsedClientId(body.client_id);
  const clientId = role === 'client' ? requestedClientId : null;
  const password = String(body.password ?? '');

  if (!email || !email.includes('@')) throw new Error('A valid email address is required.');
  if (!validUsername(username)) throw new Error('Username must be 3–64 lowercase letters, numbers, dots, underscores, or hyphens.');
  if (!name) throw new Error('Full name is required.');
  if (!validRole(role)) throw new Error('Choose a valid CRM role.');
  if (!validInitialPassword(password)) throw new Error('Initial password must have at least 8 characters with uppercase, lowercase, number, and symbol.');
  await requireClientLink(role, clientId);

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, crm_role: role, force_password_change: true },
  });
  if (createError || !created.user) throw new Error(createError?.message || 'Could not create Auth user.');

  const { data: profile, error: profileError } = await serviceClient
    .from('crm_profiles')
    .insert({
      auth_user_id: created.user.id,
      email,
      username,
      name,
      role,
      status: 'active',
      must_change_password: true,
      client_id: clientId,
      department,
    })
    .select('id, auth_user_id, email, username, name, role, status, must_change_password, client_id, department')
    .single();
  if (profileError || !profile) {
    await serviceClient.auth.admin.deleteUser(created.user.id);
    throw new Error(profileError?.message || 'Could not create CRM profile.');
  }
  return { profile };
}

async function updateProfile(body: Record<string, unknown>) {
  const profileId = Number(body.profile_id ?? body.id);
  if (!Number.isInteger(profileId) || profileId < 1) throw new Error('A valid profile id is required.');

  const { data: existing, error: lookupError } = await serviceClient
    .from('crm_profiles')
    .select('id, auth_user_id, email, username, name, role, status, must_change_password, client_id, department')
    .eq('id', profileId)
    .single();
  if (lookupError || !existing) throw new Error('Profile not found.');

  const role = body.role == null ? existing.role : body.role;
  const status = body.status == null ? existing.status : body.status;
  if (!validRole(role)) throw new Error('Choose a valid CRM role.');
  if (!validStatus(status)) throw new Error('Choose a valid account status.');

  const email = body.email == null ? existing.email : normalizedEmail(body.email);
  const username = body.username == null ? existing.username : normalizedUsername(body.username);
  const name = body.name == null ? existing.name : String(body.name).trim();
  const requestedClientId = body.client_id === '' || body.client_id == null
    ? (role === 'client' ? existing.client_id : null)
    : parsedClientId(body.client_id);
  const clientId = role === 'client' ? requestedClientId : null;
  if (!email || !email.includes('@')) throw new Error('A valid email address is required.');
  if (!validUsername(username)) throw new Error('Username must be 3–64 lowercase letters, numbers, dots, underscores, or hyphens.');
  if (!name) throw new Error('Full name is required.');
  await requireClientLink(role, clientId);

  if (existing.auth_user_id) {
    const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(existing.auth_user_id, {
      email,
      user_metadata: { name, crm_role: role },
      ban_duration: status === 'active' ? 'none' : '876000h',
    });
    if (authUpdateError) throw new Error(authUpdateError.message);
  }

  const { data: profile, error } = await serviceClient
    .from('crm_profiles')
    .update({
      email,
      username,
      name,
      role,
      status,
      client_id: clientId,
      department: String(body.department ?? existing.department ?? '').trim(),
    })
    .eq('id', profileId)
    .select('id, auth_user_id, email, username, name, role, status, must_change_password, client_id, department')
    .single();
  if (error || !profile) throw new Error(error?.message || 'Could not update CRM profile.');
  return { profile };
}

async function changeInitialPassword(request: Request, body: Record<string, unknown>) {
  const user = await requireAuthenticatedUser(request);
  const password = String(body.password ?? '');
  if (!validInitialPassword(password)) throw new Error('Password must have at least 8 characters with uppercase, lowercase, number, and symbol.');
  const { data: profile, error: profileError } = await serviceClient
    .from('crm_profiles')
    .select('id, status, must_change_password')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (profileError || !profile || !['active', 'pending'].includes(profile.status) || !profile.must_change_password) {
    throw new Error('This account is not awaiting an initial password change.');
  }
  const { error: updateError } = await serviceClient.auth.admin.updateUserById(user.id, {
    password,
    user_metadata: { ...(user.user_metadata || {}), force_password_change: false },
  });
  if (updateError) throw new Error(updateError.message);
  const { error: profileUpdateError } = await serviceClient
    .from('crm_profiles')
    .update({
      must_change_password: false,
      status: profile.status === 'pending' ? 'active' : profile.status,
    })
    .eq('id', profile.id);
  if (profileUpdateError) throw new Error(profileUpdateError.message);
  return { ok: true };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);

  try {
    const body = await request.json() as Record<string, unknown>;
    const operation = String(body.operation ?? '').trim();
    if (operation === 'change_initial_password') return json(request, await changeInitialPassword(request, body));
    await requireAdmin(request);
    if (operation === 'invite') return json(request, await inviteUser(body), 201);
    if (operation === 'provision') return json(request, await provisionUser(body), 201);
    if (operation === 'update_profile' || operation === 'set_status') return json(request, await updateProfile(body));
    return json(request, { error: 'Unsupported admin user operation.' }, 400);
  } catch (error) {
    if (error instanceof Response) return error;
    return json(request, { error: errorMessage(error) }, 400);
  }
});
