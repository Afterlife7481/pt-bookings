type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  /** Unique scope prefix, e.g. "magic-link:ip" */
  scope: string;
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

function cleanupExpired(now: number) {
  if (buckets.size < 10_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  { scope, limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  cleanupExpired(now);

  const bucketKey = `${scope}:${key}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
    );
    return { allowed: false, retryAfterSec };
  }

  existing.count += 1;
  return { allowed: true };
}

export function rateLimitResponse(retryAfterSec: number) {
  return Response.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

export function enforceRateLimit(
  key: string,
  options: RateLimitOptions,
): Response | null {
  const result = checkRateLimit(key, options);
  if (result.allowed) return null;
  return rateLimitResponse(result.retryAfterSec);
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
