import { describe, expect, it } from "vitest";
import { isPublicApiPath, isTrainerApiPath } from "./middleware";

describe("public API allowlist", () => {
  it("allows client capability endpoints without a trainer session", () => {
    expect(isPublicApiPath("/api/client/template-conflict/ack")).toBe(true);
    expect(isPublicApiPath("/api/client/last-minute/accept")).toBe(true);
    expect(isPublicApiPath("/api/client/sessions/cancel")).toBe(true);
    expect(isPublicApiPath("/api/change")).toBe(true);
    expect(isPublicApiPath("/api/client-book")).toBe(true);
    expect(isPublicApiPath("/api/opt-in")).toBe(true);
  });

  it("keeps trainer APIs protected", () => {
    expect(isTrainerApiPath("/api/bookings")).toBe(true);
    expect(isTrainerApiPath("/api/feed")).toBe(true);
    expect(isTrainerApiPath("/api/client/template-conflict/ack")).toBe(false);
  });
});
