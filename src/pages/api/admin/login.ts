import type { APIRoute } from 'astro';
import { getAdminCredentials, setSessionCookie } from '../../../lib/adminAuth';
import { jsonError, jsonOk } from '../../../lib/apiResponse';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const creds = getAdminCredentials();

    if (username !== creds.username || password !== creds.password) {
      return jsonError('Invalid username or password.', 401);
    }

    setSessionCookie(cookies, username);
    return jsonOk();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unsafe')) {
      return jsonError(error.message, 500);
    }
    return jsonError('Invalid request payload.', 400);
  }
};
