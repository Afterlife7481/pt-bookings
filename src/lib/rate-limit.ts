import { getPool } from "@/lib/db";
import { isStaging } from "@/lib/env";

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

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

function cleanupExpiredMemory(now: number) {
  if (memoryBuckets.size < 10_000) return;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) {
      memoryBuckets.delete(key);
    }
  }
}

function checkRateLimitMemory(
  key: string,
  { scope, limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  cleanupExpiredMemory(now);

  const bucketKey = `${scope}:${key}`;
  const existing = memoryBuckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
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

/**
 * Shared Postgres-backed limiter so multiple app instances share one budget.
 * Falls back to in-memory when VITEST=true (unit tests without DB setup).
 */
async function checkRateLimitPostgres(
  key: string,
  { scope, limit, windowMs }: RateLimitOptions,
): Promise<RateLimitResult> {
  const pool = getPool();
  const bucketKey = `${scope}:${key}`;
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const resetAtIso = new Date(nowMs + windowMs).toISOString();

  const result = await pool.query<{ count: number; reset_at: string }>(
    `INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
     VALUES ($1, 1, $2)
     ON CONFLICT (bucket_key) DO UPDATE
     SET
       count = CASE
         WHEN rate_limit_buckets.reset_at <= $3 THEN 1
         ELSE rate_limit_buckets.count + 1
       END,
       reset_at = CASE
         WHEN rate_limit_buckets.reset_at <= $3 THEN $2
         ELSE rate_limit_buckets.reset_at
       END
     RETURNING count, reset_at`,
    [bucketKey, resetAtIso, nowIso],
  );

  const row = result.rows[0];
  if (!row) return { allowed: true };

  if (row.count > limit) {
    const resetMs = Date.parse(row.reset_at);
    const retryAfterSec = Math.max(
      1,
      Math.ceil((resetMs - nowMs) / 1000),
    );
    return { allowed: false, retryAfterSec };
  }

  return { allowed: true };
}

function useMemoryRateLimit(): boolean {
  return process.env.VITEST === "true";
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  // Staging is for QA — do not throttle magic links or client actions.
  if (isStaging()) {
    return { allowed: true };
  }

  if (useMemoryRateLimit()) {
    return checkRateLimitMemory(key, options);
  }

  return checkRateLimitPostgres(key, options);
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

export async function enforceRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<Response | null> {
  const result = await checkRateLimit(key, options);
  if (result.allowed) return null;
  return rateLimitResponse(result.retryAfterSec);
}

export function resetRateLimitsForTests() {
  memoryBuckets.clear();
}
