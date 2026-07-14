import { describe, expect, it } from "vitest";
import { datetimeRangesOverlap } from "@/lib/holidays-utils";

describe("session overlap rules", () => {
  it("detects overlapping session ranges", () => {
    expect(
      datetimeRangesOverlap(
        "2026-08-05T14:15:00",
        "2026-08-05T15:05:00",
        "2026-08-05T14:45:00",
        "2026-08-05T15:45:00",
      ),
    ).toBe(true);
  });

  it("allows back-to-back sessions that touch but do not overlap", () => {
    expect(
      datetimeRangesOverlap(
        "2026-08-05T14:00:00",
        "2026-08-05T14:50:00",
        "2026-08-05T14:50:00",
        "2026-08-05T15:40:00",
      ),
    ).toBe(false);
  });
});
