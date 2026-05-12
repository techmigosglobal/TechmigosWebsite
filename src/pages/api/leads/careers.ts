import type { APIRoute } from 'astro';
import { jsonError, jsonOk } from '../../../lib/apiResponse';
import { saveCareerResume, validateResumeFile } from '../../../lib/careerUploads';
import { saveLead } from '../../../lib/leads';
import { checkRateLimit, getRequestIp } from '../../../lib/rateLimit';
import { validateCsrfToken, CSRF_HEADER } from '../../../lib/csrfMiddleware';

export const prerender = true;

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const POST: APIRoute = async ({ request, clientAddress, cookies }) => {
  try {
    const csrfToken = request.headers.get(CSRF_HEADER);
    const csrfSecret = cookies?.get('tm_csrf_secret')?.value;

    if (!csrfToken || !csrfSecret || !validateCsrfToken(csrfToken, csrfSecret)) {
      return jsonError('Invalid CSRF token. Please refresh the page and try again.', 403);
    }

    const ip = getRequestIp(request, clientAddress);
    const rate = checkRateLimit(`careers:${ip}`, 5, 15 * 60 * 1000);
    if (!rate.allowed) {
      return jsonError('Too many requests. Please try again later.', 429);
    }

    const formData = await request.formData();
    const honeypot = asString(formData.get('company_website'));
    if (honeypot) {
      return jsonOk({ accepted: true });
    }

    const rawResume = formData.get('cv');
    const resume = rawResume instanceof File ? rawResume : null;

    const payload = {
      jobTitle: asString(formData.get('jobTitle')),
      name: asString(formData.get('name')),
      email: asString(formData.get('email')),
      linkedin: asString(formData.get('linkedin')),
      portfolio: asString(formData.get('portfolio')),
      coverLetter: asString(formData.get('coverLetter')),
    };

    const fieldErrors: Record<string, string> = {};
    if (!payload.jobTitle) fieldErrors.jobTitle = 'Job title is required.';
    if (!payload.name) fieldErrors.name = 'Name is required.';
    if (!payload.email || !isEmail(payload.email)) fieldErrors.email = 'Valid email is required.';
    if (!payload.coverLetter || payload.coverLetter.length < 30) {
      fieldErrors.coverLetter = 'Please add at least 30 characters in your cover letter.';
    }
    if (!resume || !resume.size) {
      fieldErrors.cv = 'Please upload your resume file.';
    } else {
      const resumeError = validateResumeFile(resume);
      if (resumeError) fieldErrors.cv = resumeError;
    }

    if (Object.keys(fieldErrors).length > 0) {
      return jsonError('Validation failed.', 400, fieldErrors);
    }

    const upload = await saveCareerResume(resume as File, payload.name);

    await saveLead('careers', {
      ...payload,
      resumeOriginalName: upload.originalName,
      resumeStoredFileName: upload.storedFileName,
      resumeMimeType: upload.mimeType,
      resumeSize: upload.size,
      resumePath: upload.relativePath,
    }, ip);

    return jsonOk({ accepted: true });
  } catch (error) {
    console.error('[leads/careers] submission failed', error);
    return jsonError('Could not submit your application right now.', 500);
  }
};
