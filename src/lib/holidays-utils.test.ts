import { describe, expect, it } from "vitest";
import {
  buildHolidayScheduleIndex,
  datetimeRangesOverlap,
  dayOverlapsHoliday,
  normalizeHolidayDateTime,
  slotTimeOverlapsHoliday,
} from "@/lib/holidays-utils";

describe("holidays-utils", () => {
  it("normalizes datetime-local values", () => {
    expect(normalizeHolidayDateTime("2026-08-01T09:00")).toBe(
      "2026-08-01T09:00:00",
    );
  });

  it("detects overlapping datetime ranges", () => {
    expect(
      datetimeRangesOverlap(
        "2026-08-01T09:00:00",
        "2026-08-01T10:00:00",
        "2026-08-01T09:30:00",
        "2026-08-01T11:00:00",
      ),
    ).toBe(true);
    expect(
      datetimeRangesOverlap(
        "2026-08-01T09:00:00",
        "2026-08-01T10:00:00",
        "2026-08-01T10:00:00",
        "2026-08-01T11:00:00",
      ),
    ).toBe(false);
  });

  it("detects day and slot overlap with holidays", () => {
    const holidays = [
      {
        startAt: "2026-08-05T00:00:00",
        endAt: "2026-08-06T00:00:00",
        label: "Day off",
      },
    ];

    expect(dayOverlapsHoliday("2026-08-03", 3, holidays)).toBeTruthy();
    expect(
      slotTimeOverlapsHoliday(
        "2026-08-03",
        3,
        "09:00",
        "10:00",
        holidays,
      ),
    ).toBeTruthy();
    expect(
      slotTimeOverlapsHoliday(
        "2026-08-03",
        1,
        "09:00",
        "10:00",
        holidays,
      ),
    ).toBeNull();
  });

  it("builds a reusable holiday schedule index", () => {
    const holidays = [
      {
        startAt: "2026-08-05T00:00:00",
        endAt: "2026-08-06T00:00:00",
        label: "Day off",
      },
    ];

    const index = buildHolidayScheduleIndex("2026-08-03", holidays, [
      "09:00",
      "10:00",
    ]);

    expect(index.unavailableDays.has(3)).toBe(true);
    expect(index.blockedSlotKeys.has("3-09:00")).toBe(true);
    expect(index.blockedSlotKeys.has("1-09:00")).toBe(false);
  });
});
