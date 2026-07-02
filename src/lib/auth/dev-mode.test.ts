import { afterEach, describe, expect, it } from "vitest";
import {
  shouldExposeMagicLinks,
  shouldExposeMagicLinkForEmail,
} from "./dev-mode";

describe("shouldExposeMagicLinks", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("is true on the local tier", () => {
    process.env.APP_ENV = "local";
    delete process.env.EXPOSE_DEV_MAGIC_LINKS;
    expect(shouldExposeMagicLinks()).toBe(true);
  });

  it("infers local from NODE_ENV=development when APP_ENV is unset", () => {
    delete process.env.APP_ENV;
    process.env.NODE_ENV = "development";
    delete process.env.EXPOSE_DEV_MAGIC_LINKS;
    expect(shouldExposeMagicLinks()).toBe(true);
  });

  it("is never true on staging", () => {
    process.env.APP_ENV = "staging";
    process.env.EXPOSE_DEV_MAGIC_LINKS = "1";
    expect(shouldExposeMagicLinks()).toBe(false);
  });

  it("is never true in production, even with the override or on Railway", () => {
    process.env.APP_ENV = "production";
    process.env.RAILWAY_SERVICE_ID = "svc-123";
    process.env.EXPOSE_DEV_MAGIC_LINKS = "1";
    expect(shouldExposeMagicLinks()).toBe(false);
  });

  it("can be disabled on the local tier with EXPOSE_DEV_MAGIC_LINKS=0", () => {
    process.env.APP_ENV = "local";
    process.env.EXPOSE_DEV_MAGIC_LINKS = "0";
    expect(shouldExposeMagicLinks()).toBe(false);
  });
});

describe("shouldExposeMagicLinkForEmail", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("exposes for allowlisted emails on staging (case-insensitive)", () => {
    process.env.APP_ENV = "staging";
    process.env.MAGIC_LINK_DEBUG_EMAILS = "alex@example.com, sam@example.com";
    expect(shouldExposeMagicLinkForEmail("ALEX@example.com")).toBe(true);
    expect(shouldExposeMagicLinkForEmail("sam@example.com")).toBe(true);
  });

  it("does not expose for non-allowlisted emails on staging", () => {
    process.env.APP_ENV = "staging";
    process.env.MAGIC_LINK_DEBUG_EMAILS = "alex@example.com";
    expect(shouldExposeMagicLinkForEmail("mallory@example.com")).toBe(false);
  });

  it("never exposes in production, even for allowlisted emails", () => {
    process.env.APP_ENV = "production";
    process.env.MAGIC_LINK_DEBUG_EMAILS = "alex@example.com";
    expect(shouldExposeMagicLinkForEmail("alex@example.com")).toBe(false);
  });

  it("exposes for everyone on the local tier", () => {
    process.env.APP_ENV = "local";
    delete process.env.MAGIC_LINK_DEBUG_EMAILS;
    expect(shouldExposeMagicLinkForEmail("anyone@example.com")).toBe(true);
  });
});
