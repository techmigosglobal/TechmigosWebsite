import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? serviceRoleKey;

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const authClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Admin user operation failed.';
}

function normalizedEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
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

async function requireAdmin(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: corsHeaders });

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: corsHeaders });
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('crm_profiles')
    .select('id, auth_user_id, role, status')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'company_admin' || profile.status !== 'active') {
    throw new Response(JSON.stringify({ error: 'Only active company admins can manage users.' }), { status: 403, headers: corsHeaders });
  }

  return { user: authData.user, profile };
}

async function inviteUser(body: Record<string, unknown>) {
  const email = normalizedEmail(body.email);
  const name = String(body.name ?? '').trim();
  const role = body.role;
  const status = validStatus(body.status) ? body.status : 'pending';
  const clientId = body.client_id === '' || body.client_id == null ? null : Number(body.client_id);

  if (!email || !email.includes('@')) throw new Error('A valid email address is required.');
  if (!name) throw new Error('Full name is required.');
  if (!validRole(role)) throw new Error('Choose a valid CRM role.');
  await requireClientLink(role, clientId);

  const { data: invited, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { name, crm_role: role },
  });
  if (inviteError || !invited.user) throw new Error(inviteError?.message || 'Could not invite Auth user.');

  const { data: profile, error: profileError } = await serviceClient
    .from('crm_profiles')
    .insert({
      auth_user_id: invited.user.id,
      email,
      name,
      role,
      status,
      client_id: clientId,
      department: String(body.department ?? '').trim(),
    })
    .select('id, auth_user_id, email, name, role, status, client_id, department')
    .single();

  if (profileError || !profile) {
    await serviceClient.auth.admin.deleteUser(invited.user.id);
    throw new Error(profileError?.message || 'Could not create CRM profile.');
  }

  return { profile };
}

async function updateProfile(body: Record<string, unknown>) {
  const profileId = Number(body.profile_id ?? body.id);
  if (!Number.isInteger(profileId) || profileId < 1) throw new Error('A valid profile id is required.');

  const { data: existing, error: lookupError } = await serviceClient
    .from('crm_profiles')
    .select('id, auth_user_id, email, name, role, status, client_id, department')
    .eq('id', profileId)
    .single();
  if (lookupError || !existing) throw new Error('Profile not found.');

  const role = body.role == null ? existing.role : body.role;
  const status = body.status == null ? existing.status : body.status;
  if (!validRole(role)) throw new Error('Choose a valid CRM role.');
  if (!validStatus(status)) throw new Error('Choose a valid account status.');

  const email = body.email == null ? existing.email : normalizedEmail(body.email);
  const name = body.name == null ? existing.name : String(body.name).trim();
  const clientId = body.client_id === '' || body.client_id == null
    ? (role === 'client' ? existing.client_id : null)
    : Number(body.client_id);
  if (!email || !email.includes('@')) throw new Error('A valid email address is required.');
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
      name,
      role,
      status,
      client_id: clientId,
      department: String(body.department ?? existing.department ?? '').trim(),
    })
    .eq('id', profileId)
    .select('id, auth_user_id, email, name, role, status, client_id, department')
    .single();
  if (error || !profile) throw new Error(error?.message || 'Could not update CRM profile.');
  return { profile };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    await requireAdmin(request);
    const body = await request.json() as Record<string, unknown>;
    const operation = String(body.operation ?? '').trim();
    if (operation === 'invite') return json(await inviteUser(body), 201);
    if (operation === 'update_profile' || operation === 'set_status') return json(await updateProfile(body));
    return json({ error: 'Unsupported admin user operation.' }, 400);
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, 400);
  }
});
