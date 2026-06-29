import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/constants";
import { timeRowsInScheduleRange } from "@/lib/schedule-grid";
import type { ScheduleEntry } from "@/lib/services/schedule";
import {
  dateForWeekDay,
  findEntryForScheduleRow,
} from "./schedule-utils";

function mondayEntry(
  start: string,
  end: string,
  slotId: string,
): ScheduleEntry {
  return {
    slotId,
    startAt: `2026-06-29T${start}:00`,
    endAt: `2026-06-29T${end}:00`,
    status: "available",
    location: { id: "loc", name: "Chelsea" },
    booking: null,
    lastMinute: null,
  };
}

describe("schedule-utils week grid", () => {
  const weekStart = "2026-06-29";
  const entries: ScheduleEntry[] = [
    mondayEntry("07:00", "08:00", "1"),
    mondayEntry("08:00", "09:00", "2"),
    mondayEntry("09:00", "10:00", "3"),
    mondayEntry("10:00", "11:00", "4"),
    mondayEntry("11:00", "12:00", "5"),
    mondayEntry("13:00", "14:00", "6"),
    mondayEntry("14:00", "15:00", "7"),
    mondayEntry("15:00", "16:00", "8"),
  ];

  it("maps Monday column to 2026-06-29 when weekStart is Monday", () => {
    expect(formatDate(dateForWeekDay(weekStart, 1))).toBe("2026-06-29");
  });

  it("leaves lunch gap and afternoon rows addable on Monday", () => {
    const dateKey = formatDate(dateForWeekDay(weekStart, 1));
    const timeRows = timeRowsInScheduleRange("07:00", "19:00");

    const addable = timeRows.filter((rowTime) => {
      const match = findEntryForScheduleRow(entries, dateKey, rowTime);
      return !match;
    });

    expect(addable).toContain("12:00");
    expect(addable).toContain("12:30");
    expect(addable).toContain("16:00");
    expect(addable).toContain("18:30");
    expect(addable.length).toBeGreaterThanOrEqual(6);
  });

  it("marks continuation rows as covered, not addable", () => {
    const dateKey = formatDate(dateForWeekDay(weekStart, 1));
    const match = findEntryForScheduleRow(entries, dateKey, "07:30");
    expect(match).toEqual({ entry: entries[0], isStart: false });
  });
});
