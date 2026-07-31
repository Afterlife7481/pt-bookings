/**
 * Best-effort client IP for rate limiting.
 *
 * Behind a single trusted reverse proxy that *appends* to X-Forwarded-For,
 * the rightmost hop is the one the proxy observed (attacker-controlled values
 * appear earlier in the list). Prefer that over the leftmost entry.
 */
export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}
