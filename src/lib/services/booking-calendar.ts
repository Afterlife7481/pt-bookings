import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, clients, locations, slots, trainers } from "@/lib/db/schema";
import { bookingUrl, bookingCalendarUrl, DEFAULT_TIMEZONE, isInactiveBookingStatus } from "@/lib/constants";
import {
  buildCalendarExportOptions,
  buildGoogleCalendarUrl,
  buildIcsCalendar,
  buildOutlookCalendarUrl,
  calendarSequenceFromUpdatedAt,
  type CalendarEventInput,
  type CalendarExportOption,
} from "@/lib/calendar/ics";
import { getTrainerSettings } from "./settings";

export type BookingCalendarPayload = {
  filename: string;
  ics: string;
  googleCalendarUrl: string;
  outlookCalendarUrl: string;
  options: CalendarExportOption[];
  event: CalendarEventInput;
};

function calendarUid(bookingId: string): string {
  return `${bookingId}@ptbookings`;
}

function calendarFilename(startAt: string): string {
  const datePart = startAt.split("T")[0] ?? "session";
  return `pt-session-${datePart}.ics`;
}

export async function getBookingCalendarPayload(
  bookingToken: string,
): Promise<BookingCalendarPayload | null> {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.token, bookingToken),
  });
  if (!booking || isInactiveBookingStatus(booking.status)) return null;

  const [slot, client, trainer, settings] = await Promise.all([
    booking.slotId
      ? db.query.slots.findFirst({ where: eq(slots.id, booking.slotId) })
      : Promise.resolve(null),
    db.query.clients.findFirst({ where: eq(clients.id, booking.clientId) }),
    db.query.trainers.findFirst({ where: eq(trainers.id, booking.trainerId) }),
    getTrainerSettings(booking.trainerId),
  ]);

  if (!client) return null;

  const startAt = slot?.startAt ?? booking.sessionStartAt;
  const endAt =
    slot?.endAt ??
    (() => {
      const start = startAt.split("T");
      const [datePart, timePart = "09:00:00"] = start;
      const [hh, mm] = timePart.split(":").map(Number);
      const endHour = hh + 1;
      return `${datePart}T${String(endHour).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
    })();

  const location = slot?.locationId
    ? await db.query.locations.findFirst({
        where: eq(locations.id, slot.locationId),
      })
    : null;

  const trainerName = trainer?.name?.trim() || "Your trainer";
  const sessionUrl = bookingUrl(booking.token);
  const locationLabel = location?.name?.trim() ?? null;

  const event: CalendarEventInput = {
    uid: calendarUid(booking.id),
    sequence: calendarSequenceFromUpdatedAt(booking.updatedAt),
    title: `PT session with ${trainerName}`,
    description: [
      `Session with ${trainerName}.`,
      locationLabel ? `Location: ${locationLabel}.` : null,
      `View or manage your booking: ${sessionUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    location: location?.address?.trim() || locationLabel,
    startAt,
    endAt,
    timeZone: settings.timezone || DEFAULT_TIMEZONE,
    status: "CONFIRMED",
  };

  return {
    filename: calendarFilename(startAt),
    ics: buildIcsCalendar([event]),
    googleCalendarUrl: buildGoogleCalendarUrl(event),
    outlookCalendarUrl: buildOutlookCalendarUrl(event),
    options: buildCalendarExportOptions({
      event,
      icsHref: bookingCalendarUrl(booking.token),
      googleCalendarUrl: buildGoogleCalendarUrl(event),
      outlookCalendarUrl: buildOutlookCalendarUrl(event),
    }),
    event,
  };
}
