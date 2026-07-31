import { afterEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimitsForTests } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    delete process.env.APP_ENV;
    resetRateLimitsForTests();
  });

  it("allows requests up to the limit", async () => {
    process.env.APP_ENV = "production";
    const options = { scope: "test", limit: 3, windowMs: 60_000 };

    expect((await checkRateLimit("a", options)).allowed).toBe(true);
    expect((await checkRateLimit("a", options)).allowed).toBe(true);
    expect((await checkRateLimit("a", options)).allowed).toBe(true);
  });

  it("blocks requests over the limit", async () => {
    process.env.APP_ENV = "production";
    const options = { scope: "test-block", limit: 2, windowMs: 60_000 };

    expect((await checkRateLimit("b", options)).allowed).toBe(true);
    expect((await checkRateLimit("b", options)).allowed).toBe(true);

    const blocked = await checkRateLimit("b", options);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("tracks keys independently", async () => {
    process.env.APP_ENV = "production";
    const options = { scope: "test-keys", limit: 1, windowMs: 60_000 };

    expect((await checkRateLimit("one", options)).allowed).toBe(true);
    expect((await checkRateLimit("two", options)).allowed).toBe(true);
    expect((await checkRateLimit("one", options)).allowed).toBe(false);
  });

  it("disables all limits on staging", async () => {
    process.env.APP_ENV = "staging";
    const options = { scope: "test-staging", limit: 1, windowMs: 60_000 };

    expect((await checkRateLimit("same", options)).allowed).toBe(true);
    expect((await checkRateLimit("same", options)).allowed).toBe(true);
    expect((await checkRateLimit("same", options)).allowed).toBe(true);
  });
});
