import type { APIRoute } from 'astro';
import { generateCsrfToken, CSRF_COOKIE_OPTIONS } from '../../lib/csrfMiddleware';

export const prerender = true;

export const GET: APIRoute = async ({ cookies }) => {
  const { token, secret } = generateCsrfToken();

  // Set the secret in a cookie for validation later
  cookies.set('tm_csrf_secret', secret, CSRF_COOKIE_OPTIONS);

  return new Response(JSON.stringify({ token }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};