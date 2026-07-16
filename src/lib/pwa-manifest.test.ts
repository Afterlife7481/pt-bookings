import { describe, expect, it } from "vitest";
import {
  buildClientPwaManifest,
  buildTrainerPwaManifest,
  clientManifestPath,
} from "@/lib/pwa-manifest";

describe("pwa manifest builders", () => {
  it("builds trainer manifest scoped to dashboard", () => {
    const manifest = buildTrainerPwaManifest();

    expect(manifest.start_url).toBe("/dashboard/schedule");
    expect(manifest.scope).toBe("/dashboard/");
    expect(manifest.id).toBe("/dashboard/");
  });

  it("builds client manifest with token-specific start URL and id", () => {
    const token = "abc123";
    const manifest = buildClientPwaManifest(token, "Alex");

    expect(manifest.start_url).toBe("/c/abc123");
    expect(manifest.id).toBe("/c/abc123");
    expect(manifest.scope).toBe("/");
    expect(manifest.name).toContain("Alex");
    expect(manifest.short_name).toBe("Alex sessions");
  });

  it("uses a generic short name for long client names", () => {
    const manifest = buildClientPwaManifest(
      "abc123",
      "Very Long Client Name Here",
    );

    expect(manifest.short_name).toBe("My sessions");
  });

  it("builds client manifest path", () => {
    expect(clientManifestPath("tok")).toBe("/c/tok/manifest.webmanifest");
  });
});
