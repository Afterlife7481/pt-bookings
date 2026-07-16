import { describe, expect, it } from "vitest";
import {
  buildGoogleCalendarUrl,
  buildIcsCalendar,
  buildOutlookCalendarUrl,
  escapeIcsText,
  icsCompactLocalDateTime,
  wallClockToUtcDate,
} from "@/lib/calendar/ics";

describe("ics", () => {
  it("escapes special characters", () => {
    expect(escapeIcsText("Room; A, ground\nfloor")).toBe(
      "Room\\; A\\, ground\\nfloor",
    );
  });

  it("formats compact local datetimes", () => {
    expect(icsCompactLocalDateTime("2026-08-05T09:00:00")).toBe(
      "20260805T090000",
    );
  });

  it("builds a valid ICS document", () => {
    const ics = buildIcsCalendar([
      {
        uid: "abc123@ptbookings",
        title: "PT session with Alex",
        description: "View booking: https://example.com/s/token",
        location: "Hyde Park",
        startAt: "2026-08-05T09:00:00",
        endAt: "2026-08-05T10:00:00",
        timeZone: "Europe/London",
      },
    ]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:abc123@ptbookings");
    expect(ics).toContain("DTSTART;TZID=Europe/London:20260805T090000");
    expect(ics).toContain("DTEND;TZID=Europe/London:20260805T100000");
    expect(ics).toContain("SUMMARY:PT session with Alex");
    expect(ics).toContain("LOCATION:Hyde Park");
    expect(ics).toContain("END:VEVENT");
  });

  it("builds a Google Calendar URL with UTC dates", () => {
    const url = buildGoogleCalendarUrl({
      uid: "abc@ptbookings",
      title: "PT session",
      description: "Details",
      startAt: "2026-01-15T09:00:00",
      endAt: "2026-01-15T10:00:00",
      timeZone: "Europe/London",
      location: "Studio",
    });

    expect(url).toContain("calendar.google.com");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("text=PT+session");
    expect(url).toContain("location=Studio");
  });

  it("builds an Outlook Calendar URL", () => {
    const url = buildOutlookCalendarUrl({
      uid: "abc@ptbookings",
      title: "PT session",
      description: "Details",
      startAt: "2026-01-15T09:00:00",
      endAt: "2026-01-15T10:00:00",
      timeZone: "Europe/London",
      location: "Studio",
    });

    expect(url).toContain("outlook.live.com");
    expect(url).toContain("subject=PT+session");
    expect(url).toContain("startdt=");
    expect(url).toContain("location=Studio");
  });

  it("converts wall-clock London time to UTC in winter", () => {
    const utc = wallClockToUtcDate("2026-01-15T09:00:00", "Europe/London");
    expect(utc.getUTCHours()).toBe(9);
    expect(utc.getUTCMinutes()).toBe(0);
  });
});
