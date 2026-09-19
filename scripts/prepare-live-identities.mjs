import { randomBytes } from 'node:crypto';
import { loadLocalEnv } from './local-env.mjs';

// Explicit opt-in helper for the live Playwright gate. It uses an existing
// active CRM administrator, creates disposable linked identities, and prints
// shell assignments without writing credentials to the repository.
const env = loadLocalEnv();
const args = process.argv.slice(2);
const baseUrl = (env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL || 'https://lzlflnjrtxovzrniwmyq.supabase.co').replace(/\/$/, '');
const anonKey = env.SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_KEY;
const adminEmail = String(env.CRM_ADMIN_EMAIL || '').trim().toLowerCase();
const adminPassword = String(env.CRM_ADMIN_PASSWORD || '');
const namespace = option('namespace', env.CRM_LIVE_NAMESPACE || `codex-${Date.now()}`);

function option(name, fallback = '') {
  const equalsArg = args.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.split('=').slice(1).join('=');
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function randomPassword() {
  return `Tm-${randomBytes(18).toString('base64url')}aA1!`;
}

function checkedPassword(value) {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}

if (args.includes('--help')) {
  process.stdout.write('Usage: npm run crm:prepare-live -- [--namespace=codex-...]\nRequires an active admin identity; exports disposable role credentials without writing them to the repository.\n');
  process.exit(0);
}

if (!adminEmail || !adminPassword || !anonKey) {
  console.error('CRM_ADMIN_EMAIL, CRM_ADMIN_PASSWORD, and PUBLIC_SUPABASE_KEY are required.');
  process.exit(1);
}
if (!/^codex-[a-z0-9-]{1,80}$/.test(namespace)) {
  console.error('The live-test namespace must start with codex- and contain only lowercase letters, numbers, and hyphens.');
  process.exit(1);
}

async function request(path, init = {}, token = '') {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token || anonKey}`,
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

async function signIn(email, password) {
  return request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

async function invokeAdmin(token, body) {
  return request('/functions/v1/admin-users', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

async function ensureClient(token, email) {
  const query = `email=eq.${encodeURIComponent(email)}&select=id&limit=1`;
  const existing = await request(`/rest/v1/crm_clients?${query}`, {}, token);
  if (Array.isArray(existing) && existing[0]?.id) return existing[0].id;
  const created = await request('/rest/v1/crm_clients', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name: 'Codex Live Client', company: 'Codex Live Verification', email, status: 'active', marketing_opt_in: false }),
  }, token);
  const client = Array.isArray(created) ? created[0] : created;
  if (!client?.id) throw new Error('Supabase did not return the disposable CRM client.');
  return client.id;
}

async function provisionRole(adminToken, role, email, name, clientId = null) {
  const initialPassword = randomPassword();
  const finalPassword = randomPassword();
  if (!checkedPassword(initialPassword) || !checkedPassword(finalPassword)) throw new Error('Could not generate a valid disposable password.');
  await invokeAdmin(adminToken, {
    operation: 'provision',
    email,
    name,
    role,
    client_id: clientId,
    password: initialPassword,
  });
  const initialSession = await signIn(email, initialPassword);
  if (!initialSession?.access_token) throw new Error(`Could not sign in the new ${role} identity.`);
  await invokeAdmin(initialSession.access_token, {
    operation: 'change_initial_password',
    password: finalPassword,
  });
  return { email, password: finalPassword };
}

try {
  const adminSession = await signIn(adminEmail, adminPassword);
  if (!adminSession?.access_token) throw new Error('The supplied CRM admin credentials did not produce a session.');
  const clientEmail = `${namespace}-client@example.com`.toLowerCase();
  const employeeEmail = `${namespace}-employee@example.com`.toLowerCase();
  const clientId = await ensureClient(adminSession.access_token, clientEmail);
  const employee = await provisionRole(adminSession.access_token, 'company_member', employeeEmail, 'Codex Live Employee');
  const client = await provisionRole(adminSession.access_token, 'client', clientEmail, 'Codex Live Client', clientId);

  // stdout is intentionally shell-compatible so callers can use:
  // eval "$(node scripts/prepare-live-identities.mjs)"
  process.stdout.write([
    `export CRM_LIVE_NAMESPACE=${shellQuote(namespace)}`,
    `export CRM_EMPLOYEE_EMAIL=${shellQuote(employee.email)}`,
    `export CRM_EMPLOYEE_PASSWORD=${shellQuote(employee.password)}`,
    `export CRM_CLIENT_EMAIL=${shellQuote(client.email)}`,
    `export CRM_CLIENT_PASSWORD=${shellQuote(client.password)}`,
    `export CRM_LIVE_CLIENT_ID=${shellQuote(clientId)}`,
  ].join('\n') + '\n');
  console.error(`Prepared disposable live identities under namespace ${namespace}; client_id=${clientId}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not prepare live identities.');
  process.exitCode = 1;
}
