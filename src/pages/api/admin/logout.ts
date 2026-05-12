import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../../lib/adminAuth';
import { jsonOk } from '../../../lib/apiResponse';

export const prerender = true;

export const POST: APIRoute = async ({ cookies }) => {
  clearSessionCookie(cookies);
  return jsonOk();
};
