import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit", () => {
    const options = { scope: "test", limit: 3, windowMs: 60_000 };

    expect(checkRateLimit("a", options).allowed).toBe(true);
    expect(checkRateLimit("a", options).allowed).toBe(true);
    expect(checkRateLimit("a", options).allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const options = { scope: "test-block", limit: 2, windowMs: 60_000 };

    expect(checkRateLimit("b", options).allowed).toBe(true);
    expect(checkRateLimit("b", options).allowed).toBe(true);

    const blocked = checkRateLimit("b", options);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("tracks keys independently", () => {
    const options = { scope: "test-keys", limit: 1, windowMs: 60_000 };

    expect(checkRateLimit("one", options).allowed).toBe(true);
    expect(checkRateLimit("two", options).allowed).toBe(true);
    expect(checkRateLimit("one", options).allowed).toBe(false);
  });
});
