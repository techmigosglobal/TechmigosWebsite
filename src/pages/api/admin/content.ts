import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/adminAuth';
import { loadSiteContent, saveSiteContent, validateSiteContentPayload } from '../../../lib/siteContent';
import { jsonError, jsonOk } from '../../../lib/apiResponse';

export const prerender = true;

function unauthorized() {
  return jsonError('Unauthorized', 401);
}

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAuthenticated(cookies)) return unauthorized();

  const content = await loadSiteContent();
  return jsonOk({ content });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!isAuthenticated(cookies)) return unauthorized();

  try {
    const payload = await request.json();
    const validation = validateSiteContentPayload(payload);
    if (!validation.ok) {
      return jsonError('Validation failed.', 400, validation.fieldErrors);
    }

    const content = await saveSiteContent(payload);

    return jsonOk({ content });
  } catch {
    return jsonError('Invalid content payload.', 400);
  }
};
