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
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const authClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : defaultAllowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

async function signInWithUsername(username: string, password: string) {
  const { data: email, error: lookupError } = await serviceClient.rpc('get_email_by_username', {
    p_username: username,
  });

  // Perform a bounded Auth request on misses too, keeping username existence
  // from being disclosed by a distinct response or a fast database-only path.
  const targetEmail = !lookupError && typeof email === 'string'
    ? email
    : 'username-login-not-found@techmigos.invalid';
  const { data, error } = await authClient.auth.signInWithPassword({ email: targetEmail, password });
  if (lookupError || !email || error || !data.session) return null;

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);

  const origin = request.headers.get('Origin');
  if (origin && !allowedOrigins.has(origin)) return json(request, { error: 'Request origin is not allowed.' }, 403);

  try {
    const body = await request.json() as Record<string, unknown>;
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');
    if (!username || username.length > 254 || !password || password.length > 1024) {
      return json(request, { error: 'Username or password is incorrect.' }, 400);
    }

    const session = await signInWithUsername(username, password);
    if (!session) return json(request, { error: 'Username or password is incorrect.' }, 401);
    return json(request, { session });
  } catch {
    return json(request, { error: 'Username or password is incorrect.' }, 400);
  }
});
