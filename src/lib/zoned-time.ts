/**
 * Interpret trainer wall-clock datetimes (YYYY-MM-DDTHH:mm:ss) in an IANA zone.
 * Server host TZ is UTC; these helpers must not use `new Date(y, m, d, h, mi)`.
 */

/** Convert a wall-clock local datetime in `timeZone` to a UTC Date. */
export function wallClockToUtc(isoLocal: string, timeZone: string): Date {
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
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );

  return new Date(utcGuess + (utcGuess - asUtc));
}

/** Format a UTC instant as wall-clock `YYYY-MM-DDTHH:mm:ss` in `timeZone`. */
export function utcToWallClock(date: Date, timeZone: string): string {
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
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  const hour = String(Number(parts.hour) % 24).padStart(2, "0");
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`;
}

/** Calendar date `YYYY-MM-DD` for an instant in `timeZone`. */
export function calendarDateInZone(date: Date, timeZone: string): string {
  return utcToWallClock(date, timeZone).slice(0, 10);
}

/**
 * Monday (YYYY-MM-DD) of the week containing `date` in `timeZone`
 * (weeks start Monday).
 */
export function startOfWeekMondayDateKeyInZone(
  date: Date,
  timeZone: string,
): string {
  const dateKey = calendarDateInZone(date, timeZone);
  const [y, m, d] = dateKey.split("-").map(Number);
  // Use UTC noon to avoid DST edge when shifting calendar days.
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(noonUtc);
  const dayIndex: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = dayIndex[weekday] ?? 0;
  const monday = new Date(noonUtc.getTime() - offset * 24 * 60 * 60 * 1000);
  return calendarDateInZone(monday, timeZone);
}

/** Hours from now until a wall-clock session time in the trainer's zone. */
export function hoursUntilWallClock(
  isoLocal: string,
  timeZone: string,
  now: Date = new Date(),
): number {
  return (wallClockToUtc(isoLocal, timeZone).getTime() - now.getTime()) / (1000 * 60 * 60);
}

/** True when the wall-clock session start is before now in the trainer's zone. */
export function isWallClockPast(
  isoLocal: string,
  timeZone: string,
  now: Date = new Date(),
): boolean {
  return wallClockToUtc(isoLocal, timeZone).getTime() < now.getTime();
}

/** True when the wall-clock instant is at or before now. */
export function isWallClockEnded(
  isoLocal: string,
  timeZone: string,
  now: Date = new Date(),
): boolean {
  return wallClockToUtc(isoLocal, timeZone).getTime() <= now.getTime();
}

/** Epoch ms for sorting/comparing wall-clock times in a trainer zone. */
export function wallClockToUtcMs(isoLocal: string, timeZone: string): number {
  return wallClockToUtc(isoLocal, timeZone).getTime();
}
