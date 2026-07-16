import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/constants";
import { timeRowsInScheduleRange } from "@/lib/schedule-grid";
import type { ScheduleEntry } from "@/lib/services/schedule";
import {
  adjacentDaySelection,
  buildDayPickerChips,
  dateForWeekDay,
  findEntryForScheduleRow,
  isCalendarDatePast,
  isCalendarDateToday,
  isPastScheduleEntry,
  isPastWeekDay,
  isPastWeekRowTime,
  isTodayWeekDay,
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

  it("treats calendar days before today as past", () => {
    const today = new Date(2026, 6, 3, 12, 0, 0);
    expect(isPastWeekDay("2026-06-29", 1, today)).toBe(true);
    expect(isPastWeekDay("2026-06-29", 3, today)).toBe(true);
    expect(isPastWeekDay("2026-06-29", 5, today)).toBe(false);
    expect(isPastWeekDay("2026-06-29", 6, today)).toBe(false);
  });

  it("identifies today's column in the visible week", () => {
    const today = new Date(2026, 6, 3, 12, 0, 0);
    expect(isTodayWeekDay("2026-06-29", 5, today)).toBe(true);
    expect(isTodayWeekDay("2026-06-29", 4, today)).toBe(false);
    expect(isTodayWeekDay("2026-07-06", 5, today)).toBe(false);
  });

  it("hashes earlier rows on today but not the current or future rows", () => {
    const now = new Date(2026, 6, 3, 12, 10, 0); // Fri 3 Jul 2026 12:10
    expect(isPastWeekRowTime("2026-06-29", 5, "11:30", now)).toBe(true);
    expect(isPastWeekRowTime("2026-06-29", 5, "12:00", now)).toBe(false);
    expect(isPastWeekRowTime("2026-06-29", 5, "12:30", now)).toBe(false);
    expect(isPastWeekRowTime("2026-06-29", 4, "11:30", now)).toBe(true);
    expect(isPastWeekRowTime("2026-06-29", 6, "11:30", now)).toBe(false);
  });

  it("treats ended schedule entries as past", () => {
    const now = new Date(2026, 6, 3, 12, 0, 0);
    expect(
      isPastScheduleEntry({ endAt: "2026-07-03T11:00:00" }, now),
    ).toBe(true);
    expect(
      isPastScheduleEntry({ endAt: "2026-07-03T12:30:00" }, now),
    ).toBe(false);
  });

  it("moves to the next and previous day within the week", () => {
    expect(adjacentDaySelection(1, 1)).toEqual({ dayOfWeek: 2, weekDelta: 0 });
    expect(adjacentDaySelection(3, -1)).toEqual({ dayOfWeek: 2, weekDelta: 0 });
  });

  it("wraps across week boundaries when swiping from Sunday or Monday", () => {
    expect(adjacentDaySelection(0, 1)).toEqual({ dayOfWeek: 1, weekDelta: 1 });
    expect(adjacentDaySelection(1, -1)).toEqual({ dayOfWeek: 0, weekDelta: -1 });
  });

  it("builds a scrollable day strip that includes the active week", () => {
    const today = new Date(2026, 6, 3, 12, 0, 0); // Fri 3 Jul 2026
    const chips = buildDayPickerChips("2026-06-29", 2, 6, today);
    expect(chips[0]?.dateKey).toBe("2026-06-15");
    expect(chips.some((chip) => chip.dateKey === "2026-07-03")).toBe(true);
    expect(chips.some((chip) => chip.weekStart === "2026-06-29")).toBe(true);
    expect(isCalendarDateToday("2026-07-03", today)).toBe(true);
    expect(isCalendarDatePast("2026-07-02", today)).toBe(true);
    expect(isCalendarDatePast("2026-07-03", today)).toBe(false);
  });
});
