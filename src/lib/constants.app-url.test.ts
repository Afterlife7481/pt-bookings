import { afterEach, describe, expect, it } from "vitest";
import { appUrl, normalizeAppBaseUrl } from "@/lib/constants";

describe("normalizeAppBaseUrl", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("keeps a full https URL", () => {
    expect(
      normalizeAppBaseUrl("https://pt-bookings-production.up.railway.app"),
    ).toBe("https://pt-bookings-production.up.railway.app");
  });

  it("adds https when only a hostname is provided", () => {
    expect(
      normalizeAppBaseUrl("pt-bookings-production.up.railway.app"),
    ).toBe("https://pt-bookings-production.up.railway.app");
  });

  it("adds http for localhost without a scheme", () => {
    expect(normalizeAppBaseUrl("localhost:3000")).toBe("http://localhost:3000");
  });

  it("strips trailing slashes", () => {
    expect(normalizeAppBaseUrl("https://example.com/")).toBe("https://example.com");
  });
});

describe("appUrl", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("builds absolute paths from NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://pt-bookings-production.up.railway.app";
    expect(appUrl("/dashboard/schedule").href).toBe(
      "https://pt-bookings-production.up.railway.app/dashboard/schedule",
    );
  });
});
