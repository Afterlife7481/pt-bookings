import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDate,
  parseDateOnly,
  parseTimeOnDate,
  startOfWeekMonday,
  toLocalDateTimeString,
} from "@/lib/constants";

describe("civil date helpers (host-TZ independent)", () => {
  it("builds wall-clock slot strings from date keys without host TZ drift", () => {
    const start = parseTimeOnDate("2026-03-29", "09:00");
    expect(toLocalDateTimeString(start)).toBe("2026-03-29T09:00:00");
    expect(formatDate(addDays(parseDateOnly("2026-03-29"), 1))).toBe(
      "2026-03-30",
    );
  });

  it("handles DST spring-forward calendar days without skipping", () => {
    // Europe/London sprang forward 2026-03-29; civil +1 day must stay sequential.
    expect(formatDate(addDays(parseDateOnly("2026-03-28"), 1))).toBe(
      "2026-03-29",
    );
    expect(formatDate(addDays(parseDateOnly("2026-03-29"), 1))).toBe(
      "2026-03-30",
    );
    expect(toLocalDateTimeString(parseTimeOnDate("2026-03-29", "01:30"))).toBe(
      "2026-03-29T01:30:00",
    );
  });

  it("computes Monday week starts from date keys", () => {
    expect(formatDate(startOfWeekMonday(parseDateOnly("2026-07-01")))).toBe(
      "2026-06-29",
    );
    expect(formatDate(startOfWeekMonday(parseDateOnly("2026-06-29")))).toBe(
      "2026-06-29",
    );
  });
});
