import { loadLocalEnv } from './local-env.mjs';

const args = process.argv.slice(2);
const env = loadLocalEnv();

function option(name, fallback = '') {
  const eq = args.find((arg) => arg.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function flag(name) {
  return args.includes(`--${name}`);
}

const baseUrl = (env.INSFORGE_BASE_URL || 'https://n2hhxvw3.ap-southeast.insforge.app').replace(/\/$/, '');
const apiKey = env.INSFORGE_API_KEY;
const email = option('email').trim().toLowerCase();
const password = option('password');
const name = option('name', email);
const role = option('role', 'client');
const status = option('status', 'active');
let clientId = option('client-id');
let authUserId = option('auth-user-id');
const recreateAuth = flag('recreate-auth');

if (!apiKey) {
  console.error('INSFORGE_API_KEY is required.');
  process.exit(1);
}

if (!email || !name || !['company_admin', 'company_member', 'client'].includes(role)) {
  console.error('Usage: INSFORGE_API_KEY=... npm run portal:user -- --email user@example.com --password TempPass123! --name "User Name" --role client');
  process.exit(1);
}

async function auth(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data, text };
}

async function records(table, query = '', init = {}) {
  const suffix = query ? `?${query}` : '';
  const response = await fetch(`${baseUrl}/api/database/records/${table}${suffix}`, {
    ...init,
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${table}: ${response.status} ${text}`);
  return data;
}

async function deleteAuthUser(userId) {
  if (!userId) return;
  const response = await fetch(`${baseUrl}/api/auth/users`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ userIds: [userId] }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Could not delete auth user ${userId}: ${response.status} ${text}`);
}

async function findAuthUserId() {
  const response = await fetch(`${baseUrl}/api/auth/users?search=${encodeURIComponent(email)}&limit=10`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`Could not list auth users: ${response.status} ${text}`);
  const user = Array.isArray(data?.data) ? data.data.find((item) => item.email === email) : null;
  return user?.id || '';
}

async function signUpAuthUser() {
  const signup = await auth('/api/auth/users?client_type=server', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  if (signup.response.ok && signup.data?.user?.id) return signup.data.user.id;
  return null;
}

async function ensureAuthUser() {
  if (authUserId) return authUserId;
  if (!password) {
    throw new Error('--password or --auth-user-id is required.');
  }

  if (recreateAuth) {
    const existingProfile = await records('crm_profiles', `email=eq.${encodeURIComponent(email)}&limit=1`);
    const existingAuthUserId = (Array.isArray(existingProfile) ? existingProfile[0]?.auth_user_id : '') || await findAuthUserId();
    if (existingAuthUserId) await deleteAuthUser(existingAuthUserId);
    const recreated = await signUpAuthUser();
    if (recreated) return recreated;
    throw new Error('Could not recreate auth user.');
  }

  const created = await signUpAuthUser();
  if (created) return created;

  const signup = await auth('/api/auth/users?client_type=server', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });

  if (signup.response.status !== 409) {
    throw new Error(`Could not create auth user: ${signup.response.status} ${signup.text}`);
  }

  const login = await auth('/api/auth/sessions?client_type=server', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (login.response.ok && login.data?.user?.id) return login.data.user.id;

  throw new Error('User already exists and the supplied password did not match. Run again with --recreate-auth to reset this invite account.');
}

async function ensureClient() {
  if (role !== 'client') return clientId || null;
  if (clientId) return clientId;

  const existing = await records('crm_clients', `email=eq.${encodeURIComponent(email)}&limit=1`);
  if (Array.isArray(existing) && existing[0]?.id) return String(existing[0].id);

  const created = await records('crm_clients', '', {
    method: 'POST',
    body: JSON.stringify([
      {
        name,
        email,
        status: 'active',
        marketing_opt_in: false,
      },
    ]),
  });
  return String((Array.isArray(created) ? created[0]?.id : created?.id) || '');
}

authUserId = await ensureAuthUser();
clientId = await ensureClient();

const profile = {
  auth_user_id: authUserId,
  email,
  name,
  role,
  status,
  client_id: clientId ? Number(clientId) : null,
  updated_at: new Date().toISOString(),
};

const existing = await records('crm_profiles', `email=eq.${encodeURIComponent(email)}&limit=1`);
if (Array.isArray(existing) && existing[0]?.id) {
  await records('crm_profiles', `id=eq.${existing[0].id}`, {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });
  console.log(`Updated ${role} portal user ${email} (${authUserId}).`);
} else {
  await records('crm_profiles', '', {
    method: 'POST',
    body: JSON.stringify([{ ...profile, created_at: new Date().toISOString() }]),
  });
  console.log(`Created ${role} portal user ${email} (${authUserId}).`);
}

if (role === 'client') {
  console.log(`Linked client_id=${clientId}.`);
}
