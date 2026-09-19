import { loadLocalEnv } from './local-env.mjs';

// This script is intentionally a service-role-only maintenance tool. It uses
// Supabase Auth and PostgREST directly so disposable live-role identities do
// not depend on the retired application API or on a second data contract.
const env = loadLocalEnv();
const args = process.argv.slice(2);

function option(name, fallback = '') {
  const equalsArg = args.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.split('=').slice(1).join('=');
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function flag(name) {
  return args.includes(`--${name}`);
}

const baseUrl = (env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL || 'https://lzlflnjrtxovzrniwmyq.supabase.co').replace(/\/$/, '');
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const email = option('email').trim().toLowerCase();
const password = option('password');
const name = option('name', email);
const role = option('role', 'client');
const status = option('status', 'active');
let clientId = option('client-id');
let authUserId = option('auth-user-id');
const recreateAuth = flag('recreate-auth');

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required.');
  process.exit(1);
}

if (!email || !name || !['company_admin', 'company_member', 'client'].includes(role) || !['active', 'inactive', 'pending'].includes(status)) {
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=... npm run portal:user -- --email user@example.com --password TempPass123! --name "User Name" --role client');
  process.exit(1);
}

function validInitialPassword(value) {
  const candidate = String(value || '');
  return candidate.length >= 8
    && /[a-z]/.test(candidate)
    && /[A-Z]/.test(candidate)
    && /\d/.test(candidate)
    && /[^A-Za-z0-9]/.test(candidate);
}

async function supabaseRequest(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || text;
    throw new Error(`${response.status}: ${message || 'Supabase request failed.'}`);
  }
  return data;
}

async function authAdmin(path, init = {}) {
  return supabaseRequest(`/auth/v1/admin${path}`, init);
}

async function records(table, query = '', init = {}) {
  const suffix = query ? `?${query}` : '';
  return supabaseRequest(`/rest/v1/${table}${suffix}`, {
    ...init,
    headers: {
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
}

async function listAuthUsers() {
  const users = [];
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const result = await authAdmin(`/users?page=${page}&per_page=${perPage}`);
    const pageUsers = Array.isArray(result?.users) ? result.users : [];
    users.push(...pageUsers);
    if (pageUsers.length < perPage) break;
  }
  return users;
}

async function findAuthUser() {
  const users = await listAuthUsers();
  return users.find((user) => String(user.email || '').toLowerCase() === email) || null;
}

async function deleteAuthUser(userId) {
  if (!userId) return;
  await authAdmin(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

async function ensureAuthUser() {
  if (authUserId) return authUserId;
  let existing = await findAuthUser();
  if (existing && recreateAuth) {
    await deleteAuthUser(existing.id);
    existing = null;
  }
  if (existing) return existing.id;
  if (!validInitialPassword(password)) {
    throw new Error('A new auth user requires a password with at least 8 characters, uppercase, lowercase, number, and symbol.');
  }
  const created = await authAdmin('/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    }),
  });
  if (!created?.user?.id) throw new Error('Supabase did not return the created auth user.');
  return created.user.id;
}

async function ensureClient() {
  if (role !== 'client') return clientId || null;
  if (clientId) {
    const selected = await records('crm_clients', `id=eq.${encodeURIComponent(clientId)}&select=id&limit=1`);
    if (!Array.isArray(selected) || !selected[0]?.id) throw new Error(`CRM client ${clientId} was not found.`);
    return String(selected[0].id);
  }

  const existing = await records('crm_clients', `email=eq.${encodeURIComponent(email)}&select=id&limit=1`);
  if (Array.isArray(existing) && existing[0]?.id) return String(existing[0].id);

  const created = await records('crm_clients', '', {
    method: 'POST',
    body: JSON.stringify({ name, email, status: 'active', marketing_opt_in: false }),
  });
  const createdClient = Array.isArray(created) ? created[0] : created;
  if (!createdClient?.id) throw new Error('Supabase did not return the created CRM client.');
  return String(createdClient.id);
}

authUserId = await ensureAuthUser();
clientId = await ensureClient();

const profile = {
  auth_user_id: authUserId,
  email,
  name,
  role,
  status,
  client_id: role === 'client' && clientId ? Number(clientId) : null,
  updated_at: new Date().toISOString(),
};

const existingProfiles = await records('crm_profiles', `email=eq.${encodeURIComponent(email)}&select=id&limit=1`);
if (Array.isArray(existingProfiles) && existingProfiles[0]?.id) {
  await records('crm_profiles', `id=eq.${existingProfiles[0].id}`, {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });
  console.log(`Updated ${role} portal user ${email} (${authUserId}).`);
} else {
  await records('crm_profiles', '', {
    method: 'POST',
    body: JSON.stringify({ ...profile, created_at: new Date().toISOString() }),
  });
  console.log(`Created ${role} portal user ${email} (${authUserId}).`);
}

if (role === 'client') console.log(`Linked client_id=${clientId}.`);
