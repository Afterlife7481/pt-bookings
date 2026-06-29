import { afterEach, describe, expect, it } from "vitest";
import { shouldExposeMagicLinks } from "./dev-mode";

describe("shouldExposeMagicLinks", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("is true in development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.EXPOSE_DEV_MAGIC_LINKS;
    delete process.env.RAILWAY_SERVICE_ID;
    expect(shouldExposeMagicLinks()).toBe(true);
  });

  it("is true on Railway by default", () => {
    process.env.NODE_ENV = "production";
    process.env.RAILWAY_SERVICE_ID = "svc-123";
    expect(shouldExposeMagicLinks()).toBe(true);
  });

  it("can be disabled with EXPOSE_DEV_MAGIC_LINKS=0", () => {
    process.env.NODE_ENV = "production";
    process.env.RAILWAY_SERVICE_ID = "svc-123";
    process.env.EXPOSE_DEV_MAGIC_LINKS = "0";
    expect(shouldExposeMagicLinks()).toBe(false);
  });
});
