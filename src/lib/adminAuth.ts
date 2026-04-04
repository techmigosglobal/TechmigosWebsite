import type { AstroCookies } from 'astro';
import crypto from 'node:crypto';

const SESSION_COOKIE = 'tm_admin_session';
const SESSION_MAX_AGE = 60 * 60 * 12;
// SECURITY: Change this to a strong random string in production!
const DEFAULT_SECRET = 'change-this-admin-secret-in-env-file';

function isProd() {
  return process.env.NODE_ENV === 'production';
}

function isWeakSecret(secret: string) {
  const normalized = secret.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === 'change-this-admin-secret-in-env-file') return true;
  if (normalized.includes('replace-with')) return true;
  if (normalized.includes('default-secret')) return true;
  return secret.length < 24;
}

function isWeakCredential(value: string) {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    normalized === 'admin' ||
    normalized === 'admin123' ||
    normalized.includes('replace-with')
  );
}

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || DEFAULT_SECRET;
  if (isProd() && isWeakSecret(secret)) {
    throw new Error('Unsafe ADMIN_SESSION_SECRET in production. Configure a strong secret.');
  }
  return secret;
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function sign(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

export function getAdminCredentials() {
  // SECURITY: Default credentials are set to force configuration in production.
  // Please set ADMIN_USERNAME and ADMIN_PASSWORD in your .env file.
  const credentials = {
    username: process.env.ADMIN_USERNAME || 'admin', // TODO: Change in .env
    password: process.env.ADMIN_PASSWORD || 'admin123', // TODO: Change in .env
  };

  // Warn in development, error in production
  if (isProd() && (isWeakCredential(credentials.username) || isWeakCredential(credentials.password))) {
    throw new Error('Unsafe admin credentials in production. Configure ADMIN_USERNAME and ADMIN_PASSWORD.');
  } else if (isWeakCredential(credentials.username) || isWeakCredential(credentials.password)) {
    console.warn('[WARN] Using default admin credentials. Please configure ADMIN_USERNAME and ADMIN_PASSWORD in .env for security.');
  }

  return credentials;
}

export function createSessionValue(username: string) {
  const timestamp = Date.now().toString();
  const payload = `${username}.${timestamp}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySessionValue(value: string) {
  const [username, timestamp, signature] = value.split('.');
  if (!username || !timestamp || !signature) return false;

  const expected = sign(`${username}.${timestamp}`);
  if (!safeEqual(signature, expected)) return false;

  const ageMs = Date.now() - Number(timestamp);
  if (Number.isNaN(ageMs) || ageMs > SESSION_MAX_AGE * 1000) return false;

  return true;
}

export function isAuthenticated(cookies: AstroCookies) {
  const session = cookies.get(SESSION_COOKIE)?.value;
  if (!session) return false;
  return verifySessionValue(session);
}

export function setSessionCookie(cookies: AstroCookies, username: string) {
  cookies.set(SESSION_COOKIE, createSessionValue(username), {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
