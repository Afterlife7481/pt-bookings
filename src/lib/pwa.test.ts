import { describe, expect, it } from "vitest";
import { canUseInstallPrompt } from "@/lib/pwa";

describe("pwa helpers", () => {
  it("allows install when a deferred prompt is available", () => {
    const event = { prompt: async () => {}, userChoice: Promise.resolve({ outcome: "accepted", platform: "" }) } as never;
    expect(canUseInstallPrompt(event)).toBe(true);
  });

  it("disallows install without a deferred prompt", () => {
    expect(canUseInstallPrompt(null)).toBe(false);
  });
});
