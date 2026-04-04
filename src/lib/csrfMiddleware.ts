import crypto from 'node:crypto';

const CSRF_COOKIE = 'tm_csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_TOKEN_SIZE = 32;

/**
 * Generates a new CSRF token and secret.
 */
export function generateCsrfToken(): { token: string; secret: string } {
  const secret = crypto.randomBytes(CSRF_TOKEN_SIZE).toString('hex');
  const salt = crypto.randomBytes(CSRF_TOKEN_SIZE).toString('hex');
  const signature = crypto.createHmac('sha256', secret).update(salt).digest('hex');
  
  return {
    token: `${signature}.${salt}`,
    secret
  };
}

/**
 * Validates the incoming CSRF token against the stored secret.
 */
export function validateCsrfToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;

  const [signature, salt] = token.split('.');
  if (!signature || !salt) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(salt)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Checks if a request has a valid CSRF token.
 * @param request The incoming request
 * @param cookies The Astro cookies to get the secret
 */
export async function checkCsrf(request: Request, cookies: any): Promise<boolean> {
  const token = request.headers.get(CSRF_HEADER);
  const cookieValue = cookies?.get(CSRF_COOKIE)?.value;

  if (!token || !cookieValue) return false;

  try {
    // The cookie value should be the secret
    return validateCsrfToken(token, cookieValue);
  } catch (e) {
    return false;
  }
}

export const CSRF_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24, // 24 hours
};

export { CSRF_HEADER, CSRF_COOKIE };