import { afterEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimitsForTests } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    delete process.env.APP_ENV;
    resetRateLimitsForTests();
  });

  it("allows requests up to the limit", () => {
    process.env.APP_ENV = "production";
    const options = { scope: "test", limit: 3, windowMs: 60_000 };

    expect(checkRateLimit("a", options).allowed).toBe(true);
    expect(checkRateLimit("a", options).allowed).toBe(true);
    expect(checkRateLimit("a", options).allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    process.env.APP_ENV = "production";
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
    process.env.APP_ENV = "production";
    const options = { scope: "test-keys", limit: 1, windowMs: 60_000 };

    expect(checkRateLimit("one", options).allowed).toBe(true);
    expect(checkRateLimit("two", options).allowed).toBe(true);
    expect(checkRateLimit("one", options).allowed).toBe(false);
  });

  it("disables all limits on staging", () => {
    process.env.APP_ENV = "staging";
    const options = { scope: "test-staging", limit: 1, windowMs: 60_000 };

    expect(checkRateLimit("same", options).allowed).toBe(true);
    expect(checkRateLimit("same", options).allowed).toBe(true);
    expect(checkRateLimit("same", options).allowed).toBe(true);
  });
});
