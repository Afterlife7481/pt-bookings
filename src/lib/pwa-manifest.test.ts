import { describe, expect, it } from "vitest";
import {
  buildClientPwaManifest,
  buildTrainerPwaManifest,
  clientManifestPath,
} from "@/lib/pwa-manifest";

describe("pwa manifest builders", () => {
  it("builds trainer manifest scoped to dashboard", () => {
    const manifest = buildTrainerPwaManifest();

    expect(manifest.name).toBe("PT Bookings");
    expect(manifest.short_name).toBe("PT Bookings");
    expect(manifest.start_url).toBe("/dashboard");
    expect(manifest.scope).toBe("/dashboard/");
    expect(manifest.id).toBe("/dashboard/");
  });

  it("builds client manifest named My PT with token-specific start URL", () => {
    const token = "abc123";
    const manifest = buildClientPwaManifest(token);

    expect(manifest.name).toBe("My PT");
    expect(manifest.short_name).toBe("My PT");
    expect(manifest.start_url).toBe("/c/abc123");
    expect(manifest.id).toBe("/c/abc123");
    expect(manifest.scope).toBe("/");
  });

  it("builds client manifest path", () => {
    expect(clientManifestPath("tok")).toBe("/c/tok/manifest.webmanifest");
  });
});
