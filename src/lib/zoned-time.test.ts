import { describe, expect, it } from "vitest";
import {
  hoursUntilWallClock,
  isWallClockPast,
  wallClockToUtc,
} from "./zoned-time";

describe("wallClockToUtc", () => {
  it("maps London winter 09:00 to 09:00 UTC", () => {
    const utc = wallClockToUtc("2026-01-15T09:00:00", "Europe/London");
    expect(utc.toISOString()).toBe("2026-01-15T09:00:00.000Z");
  });

  it("maps London summer 09:00 to 08:00 UTC (BST)", () => {
    const utc = wallClockToUtc("2026-07-15T09:00:00", "Europe/London");
    expect(utc.toISOString()).toBe("2026-07-15T08:00:00.000Z");
  });

  it("maps Hong Kong 09:00 to 01:00 UTC", () => {
    const utc = wallClockToUtc("2026-07-15T09:00:00", "Asia/Hong_Kong");
    expect(utc.toISOString()).toBe("2026-07-15T01:00:00.000Z");
  });

  it("maps US Eastern summer 09:00 to 13:00 UTC (EDT)", () => {
    const utc = wallClockToUtc("2026-07-15T09:00:00", "America/New_York");
    expect(utc.toISOString()).toBe("2026-07-15T13:00:00.000Z");
  });
});

describe("hoursUntilWallClock / isWallClockPast", () => {
  it("treats HK 09:00 as eight hours earlier than a UTC host would", () => {
    // 28h before real HK 09:00 session → should be inside a 36h cancel window.
    const session = "2026-07-16T09:00:00";
    const now = new Date("2026-07-15T05:00:00.000Z"); // 13:00 HKT Jul 15 = 20h before? 
    // HK 09:00 Jul 16 = 01:00 UTC Jul 16.
    // 36h before that = 2026-07-14T13:00:00.000Z
    // 28h before that = 2026-07-14T21:00:00.000Z
    const twentyEightHoursBefore = new Date("2026-07-14T21:00:00.000Z");
    expect(hoursUntilWallClock(session, "Asia/Hong_Kong", twentyEightHoursBefore)).toBeCloseTo(
      28,
      5,
    );

    // Naïve UTC parse of 09:00 would think 36h remain at this same instant:
    // session-as-UTC 09:00 Jul 16 = 2026-07-16T09:00:00Z
    // from 2026-07-14T21:00:00Z → 36h
    const naiveUtcHours =
      (Date.parse("2026-07-16T09:00:00.000Z") - twentyEightHoursBefore.getTime()) /
      (1000 * 60 * 60);
    expect(naiveUtcHours).toBeCloseTo(36, 5);
  });

  it("marks a session past only after its zoned instant", () => {
    const session = "2026-07-16T09:00:00";
    const justBefore = new Date("2026-07-16T00:59:00.000Z"); // 08:59 HKT
    const justAfter = new Date("2026-07-16T01:01:00.000Z"); // 09:01 HKT
    expect(isWallClockPast(session, "Asia/Hong_Kong", justBefore)).toBe(false);
    expect(isWallClockPast(session, "Asia/Hong_Kong", justAfter)).toBe(true);
  });
});
