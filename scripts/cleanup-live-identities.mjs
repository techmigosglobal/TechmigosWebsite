import { loadLocalEnv } from './local-env.mjs';

const env = loadLocalEnv();
const args = process.argv.slice(2);
const baseUrl = (env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL || 'https://lzlflnjrtxovzrniwmyq.supabase.co').replace(/\/$/, '');
const anonKey = env.SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_KEY;
const adminEmail = String(env.CRM_ADMIN_EMAIL || '').trim().toLowerCase();
const adminPassword = String(env.CRM_ADMIN_PASSWORD || '');

function option(name) {
  const equalsArg = args.find((arg) => arg.startsWith(`--${name}=`));
  if (equalsArg) return equalsArg.split('=').slice(1).join('=');
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] || '' : '';
}

if (args.includes('--help')) {
  process.stdout.write([
    'Usage: npm run crm:cleanup-live -- --namespace=codex-... [--confirm=DELETE]',
    'Defaults to a read-only dry run. Confirmed cleanup deactivates namespaced test users,',
    'then uses the audited admin RPC to remove namespaced support test tickets and an isolated',
    'CRM client only when no profile or project/invoice/ticket still depends on it. Linked client records are deactivated; profiles are never deleted.',
    '',
  ].join('\n'));
  process.exit(0);
}

const namespace = option('namespace') || env.CRM_LIVE_NAMESPACE || '';
if (!/^codex-[a-z0-9-]{1,80}$/.test(namespace)) {
  console.error('Provide a test namespace beginning with codex- using --namespace or CRM_LIVE_NAMESPACE.');
  process.exit(1);
}
if (!adminEmail || !adminPassword || !anonKey) {
  console.error('CRM_ADMIN_EMAIL, CRM_ADMIN_PASSWORD, and PUBLIC_SUPABASE_KEY are required.');
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
  const body = await response.text();
  let data = null;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || body;
    throw new Error(`${response.status}: ${message || 'Supabase request failed.'}`);
  }
  return data;
}

async function signIn() {
  return request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
}

async function oneRecord(path, token, description) {
  const rows = await request(path, {}, token);
  if (!Array.isArray(rows) || rows.length > 1) throw new Error(`Expected at most one ${description}; refusing cleanup.`);
  return rows[0] || null;
}

async function profileFor(token, email, expectedRole, expectedName) {
  const query = `email=eq.${encodeURIComponent(email)}&select=id,email,name,role,status,client_id&limit=2`;
  const profile = await oneRecord(`/rest/v1/crm_profiles?${query}`, token, `${expectedRole} profile`);
  if (!profile) return null;
  if (profile.role !== expectedRole || profile.name !== expectedName) {
    throw new Error(`Profile ${email} does not match the expected disposable ${expectedRole} identity; refusing cleanup.`);
  }
  return profile;
}

async function deactivateProfile(token, profile) {
  if (!profile || profile.status === 'inactive') return;
  await request('/functions/v1/admin-users', {
    method: 'POST',
    body: JSON.stringify({
      operation: 'update_profile',
      profile_id: profile.id,
      status: 'inactive',
      client_id: profile.client_id ?? null,
    }),
  }, token);
}

try {
  const session = await signIn();
  if (!session?.access_token) throw new Error('The supplied CRM admin credentials did not produce a session.');
  const token = session.access_token;
  const employeeEmail = `${namespace}-employee@example.com`;
  const clientEmail = `${namespace}-client@example.com`;
  const employee = await profileFor(token, employeeEmail, 'company_member', 'Codex Live Employee');
  const clientProfile = await profileFor(token, clientEmail, 'client', 'Codex Live Client');
  const clientQuery = `email=eq.${encodeURIComponent(clientEmail)}&select=id,name,company,email,status&limit=2`;
  const client = await oneRecord(`/rest/v1/crm_clients?${clientQuery}`, token, 'test client');

  if (client && (client.name !== 'Codex Live Client' || client.company !== 'Codex Live Verification')) {
    throw new Error('CRM client is not marked as a disposable Codex fixture; refusing cleanup.');
  }
  if (client && clientProfile?.client_id && String(clientProfile.client_id) !== String(client.id)) {
    throw new Error('Disposable client profile is linked to a different CRM client; refusing cleanup.');
  }

  const linkedResources = [];
  let disposableTickets = [];
  if (client) {
    for (const table of ['crm_projects', 'crm_invoices']) {
      const rows = await request(`/rest/v1/${table}?client_id=eq.${encodeURIComponent(client.id)}&select=id&limit=1`, {}, token);
      if (Array.isArray(rows) && rows.length) linkedResources.push(table);
    }
    const tickets = await request(`/rest/v1/crm_tickets?client_id=eq.${encodeURIComponent(client.id)}&select=id,subject&limit=1000`, {}, token);
    const ticketRows = Array.isArray(tickets) ? tickets : [];
    disposableTickets = ticketRows.filter((ticket) => String(ticket.subject || '').startsWith('Codex support lifecycle '));
    if (ticketRows.length !== disposableTickets.length) linkedResources.push('non-test crm_tickets');
  }
  if (linkedResources.length) {
    throw new Error(`Test client still has linked ${linkedResources.join(', ')}. Clean those records first; no accounts were changed.`);
  }

  const targets = [employee, clientProfile].filter(Boolean);
  const retainedClient = Boolean(client && clientProfile);
  process.stdout.write(`Namespace ${namespace}: ${targets.length} disposable account(s), ${client ? 'one' : 'no'} test client, ${disposableTickets.length} namespaced support test ticket(s).\n`);
  if (retainedClient) {
    process.stdout.write('The CRM client record will be retained and marked inactive because its client profile must remain linked.\n');
  }
  if (option('confirm') !== 'DELETE') {
    process.stdout.write('Dry run only. Re-run with --confirm=DELETE to deactivate accounts, mark a linked test client inactive, and purge only matching support-test tickets plus any eligible unlinked test client through the audited admin cleanup RPC.\n');
    process.exit(0);
  }
  if (!targets.length && !client) {
    process.stdout.write('Nothing to clean up.\n');
    process.exit(0);
  }

  await deactivateProfile(token, employee);
  await deactivateProfile(token, clientProfile);
  if (client && clientProfile && client.status !== 'inactive') {
    await request(`/rest/v1/crm_clients?id=eq.${encodeURIComponent(client.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'inactive' }),
    }, token);
  }
  const cleanupRecords = disposableTickets.map((ticket) => ({ resource: 'tickets', id: String(ticket.id) }));
  if (client && !clientProfile) cleanupRecords.push({ resource: 'clients', id: String(client.id) });
  if (cleanupRecords.length) {
    await request('/rest/v1/rpc/purge_confirmed_crm_records', {
      method: 'POST',
      body: JSON.stringify({
        p_records: cleanupRecords,
        p_reason: `Codex live test cleanup for namespace ${namespace}`,
      }),
    }, token);
  }
  const clientDisposition = !client
    ? 'no test client remained'
    : clientProfile
      ? 'the linked test client was marked inactive and retained to preserve its profile link'
      : 'the eligible test client was removed and audited';
  process.stdout.write(`Cleanup complete: disposable accounts deactivated; ${clientDisposition}.\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Live-test cleanup failed.');
  process.exitCode = 1;
}
