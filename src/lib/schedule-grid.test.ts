import { describe, expect, it } from "vitest";
import {
  slotCoversGridRow,
  slotGridRowSpan,
  slotOffsetInRange,
  timeRowsInScheduleRange,
} from "@/lib/schedule-grid";
import {
  assertValidScheduleSlotTimes,
  isScheduleTimeAligned,
} from "@/lib/constants";

describe("schedule time steps", () => {
  it("keeps display rows on 30-minute marks", () => {
    expect(timeRowsInScheduleRange("07:00", "09:00")).toEqual([
      "07:00",
      "07:30",
      "08:00",
      "08:30",
    ]);
  });

  it("allows 5-minute booking snaps including :15 and :50", () => {
    expect(isScheduleTimeAligned("14:15")).toBe(true);
    expect(isScheduleTimeAligned("14:50")).toBe(true);
    expect(isScheduleTimeAligned("14:12")).toBe(false);
    expect(() =>
      assertValidScheduleSlotTimes("14:15", "15:05"),
    ).not.toThrow();
  });

  it("positions a 50-minute session starting at :15 inside the day range", () => {
    const offset = slotOffsetInRange("07:00", "21:00", "14:15", "15:05");
    expect(offset).not.toBeNull();
    // 14:15 is 435 minutes after 07:00; day is 840 minutes
    expect(offset!.topPercent).toBeCloseTo((435 / 840) * 100, 5);
    expect(offset!.heightPercent).toBeCloseTo((50 / 840) * 100, 5);
  });

  it("marks display rows covered by an off-grid session", () => {
    expect(slotCoversGridRow("14:15", "15:05", "14:00")).toBe(true);
    expect(slotCoversGridRow("14:15", "15:05", "14:30")).toBe(true);
    expect(slotCoversGridRow("14:15", "15:05", "15:00")).toBe(true);
    expect(slotCoversGridRow("14:15", "15:05", "15:30")).toBe(false);
  });

  it("ceils display row span for fine-grained durations", () => {
    expect(slotGridRowSpan("14:15", "15:05")).toBe(2);
  });
});
