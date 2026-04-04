type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getRequestIp(request: Request, fallback = 'unknown') {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || fallback;
  }
  const realIp = request.headers.get('x-real-ip');
  return realIp?.trim() || fallback;
}

export function checkRateLimit(key: string, limit = 8, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  return { allowed: true, remaining: Math.max(limit - existing.count, 0) };
}
