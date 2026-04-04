import crypto from 'node:crypto';

const CSRF_TOKEN_SIZE = 32; // bytes
const CSRF_HEADER = 'x-csrf-token';

/**
 * Generates a CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_SIZE).toString('hex');
}

/**
 * Validates a CSRF token.
 * @param token The token to validate (from header or form field)
 * @param secret The secret stored in the session/cookie
 * @returns true if valid, false otherwise
 */
export function validateCsrfToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;

  try {
    // Simple comparison: token should be generated from secret + salt
    // For this implementation, we'll use a signed token approach
    // token = signature.salt
    // We just need to verify the signature part
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
  } catch (e) {
    console.error('[CSRF] Validation error:', e);
    return false;
  }
}

/**
 * Creates a CSRF token pair: secret (for validation) and token (for client).
 * @returns { token: string, secret: string }
 */
export function createCsrfTokenPair(): { token: string; secret: string } {
  const secret = crypto.randomBytes(CSRF_TOKEN_SIZE).toString('hex');
  const salt = crypto.randomBytes(CSRF_TOKEN_SIZE).toString('hex');
  const signature = crypto.createHmac('sha256', secret).update(salt).digest('hex');
  
  return {
    token: `${signature}.${salt}`,
    secret
  };
}

/**
 * Validates a CSRF token given the secret.
 */
export function verifyCsrfToken(token: string, secret: string): boolean {
  return validateCsrfToken(token, secret);
}

export { CSRF_HEADER };