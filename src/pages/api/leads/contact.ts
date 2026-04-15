import type { APIRoute } from 'astro';
import { jsonError, jsonOk } from '../../../lib/apiResponse';
import { saveLead } from '../../../lib/leads';
import { checkRateLimit, getRequestIp } from '../../../lib/rateLimit';
import { validateCsrfToken, CSRF_HEADER } from '../../../lib/csrfMiddleware';

export const prerender = false;

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const POST: APIRoute = async ({ request, clientAddress, cookies }) => {
  try {
    // CSRF Check
    const csrfToken = request.headers.get(CSRF_HEADER);
    const csrfSecret = cookies?.get('tm_csrf_secret')?.value;
    
    if (!csrfToken || !csrfSecret || !validateCsrfToken(csrfToken, csrfSecret)) {
      return jsonError('Invalid CSRF token. Please refresh the page and try again.', 403);
    }

    const body = await request.json();
    const ip = getRequestIp(request, clientAddress);
    const rate = checkRateLimit(`contact:${ip}`, 6, 15 * 60 * 1000);
    if (!rate.allowed) {
      return jsonError('Too many requests. Please try again later.', 429);
    }

    const honeypot = asString(body?.company_website);
    if (honeypot) {
      return jsonOk({ accepted: true });
    }

    const payload = {
      name: asString(body?.name),
      email: asString(body?.email),
      company: asString(body?.company),
      service: asString(body?.service),
      budget: asString(body?.budget),
      message: asString(body?.message),
      sourcePath: asString(body?.sourcePath),
    };

    const fieldErrors: Record<string, string> = {};
    if (!payload.name) fieldErrors.name = 'Name is required.';
    if (!payload.email || !isEmail(payload.email)) fieldErrors.email = 'Valid email is required.';
    if (!payload.message) fieldErrors.message = 'Project description is required.';

    if (Object.keys(fieldErrors).length > 0) {
      return jsonError('Validation failed.', 400, fieldErrors);
    }

    await saveLead('contact', payload, ip);
    return jsonOk({ accepted: true });
  } catch (error) {
    console.error('[leads/contact] submission failed', error);
    return jsonError('Could not submit your message right now.', 500);
  }
};
