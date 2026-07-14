import { parseLocalDateTime } from "@/lib/constants";

export type CalendarEventInput = {
  uid: string;
  sequence?: number;
  title: string;
  description: string;
  location?: string | null;
  /** Local wall-clock datetimes (YYYY-MM-DDTHH:mm:ss). */
  startAt: string;
  endAt: string;
  timeZone: string;
  status?: "CONFIRMED" | "CANCELLED";
};

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/** ICS compact local datetime, e.g. 20260805T090000 */
export function icsCompactLocalDateTime(iso: string): string {
  const normalized =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso) ? `${iso}:00` : iso;
  const [datePart, timePart = "00:00:00"] = normalized.split("T");
  const [hh, mm, ss = "00"] = timePart.split(":");
  return `${datePart.replace(/-/g, "")}T${hh}${mm}${ss.slice(0, 2)}`;
}

export function foldIcsLine(line: string): string {
  const max = 75;
  if (line.length <= max) return line;

  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, max));
  rest = rest.slice(max);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, max - 1)}`);
    rest = rest.slice(max - 1);
  }
  return parts.join("\r\n");
}

export function buildIcsCalendar(events: CalendarEventInput[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PT Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const stamp = icsCompactUtcDateTime(new Date());

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(foldIcsLine(`UID:${event.uid}`));
    lines.push(`SEQUENCE:${event.sequence ?? 0}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(
      foldIcsLine(
        `DTSTART;TZID=${event.timeZone}:${icsCompactLocalDateTime(event.startAt)}`,
      ),
    );
    lines.push(
      foldIcsLine(
        `DTEND;TZID=${event.timeZone}:${icsCompactLocalDateTime(event.endAt)}`,
      ),
    );
    lines.push(foldIcsLine(`SUMMARY:${escapeIcsText(event.title)}`));
    lines.push(foldIcsLine(`DESCRIPTION:${escapeIcsText(event.description)}`));
    if (event.location?.trim()) {
      lines.push(foldIcsLine(`LOCATION:${escapeIcsText(event.location.trim())}`));
    }
    lines.push(`STATUS:${event.status ?? "CONFIRMED"}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function icsCompactUtcDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Convert a wall-clock local datetime in `timeZone` to UTC for Google Calendar URLs. */
export function wallClockToUtcDate(isoLocal: string, timeZone: string): Date {
  const [datePart, timePart = "00:00:00"] = isoLocal.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm, ss = 0] = timePart.split(":").map(Number);

  const utcGuess = Date.UTC(y, m - 1, d, hh, mm, ss);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(utcGuess)).map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return new Date(utcGuess + (utcGuess - asUtc));
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const start = wallClockToUtcDate(event.startAt, event.timeZone);
  const end = wallClockToUtcDate(event.endAt, event.timeZone);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${icsCompactUtcDateTime(start)}/${icsCompactUtcDateTime(end)}`,
    details: event.description,
  });
  if (event.location?.trim()) {
    params.set("location", event.location.trim());
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function calendarSequenceFromUpdatedAt(updatedAt: string): number {
  return Math.floor(parseLocalDateTime(updatedAt).getTime() / 1000);
}
