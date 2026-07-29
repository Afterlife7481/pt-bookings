import Link from "next/link";
import { ensureDb } from "@/lib/db/init";
import { getBookingByToken } from "@/lib/services/bookings";
import { getBookingCalendarPayload } from "@/lib/services/booking-calendar";
import { getTrainerById } from "@/lib/services/trainers";
import { getTrainerSettings } from "@/lib/services/settings";
import { abortChangeByBookingToken } from "@/lib/services/change";
import { Badge, Button } from "@/components/ui";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";
import { formatSlot, formatDurationMinutes } from "@/lib/utils";
import { isWithinBookingDeadline } from "@/lib/constants";
import { wallClockToUtcMs } from "@/lib/zoned-time";
import { ChangeSessionFlow } from "@/components/ChangeSessionFlow";
import { SessionActions } from "@/components/SessionActions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ change?: string }>;
}) {
  await ensureDb();
  const { token } = await params;
  const { change } = await searchParams;
  let data = await getBookingByToken(token);

  if (!data || !data.client) notFound();

  // Clear any leftover "changing" hold from the old flow.
  if (data.booking.status === "pending_change") {
    await abortChangeByBookingToken(token).catch(() => undefined);
    data = await getBookingByToken(token);
    if (!data || !data.client) notFound();
  }

  const { booking, slot, client } = data;
  const sessionStartAt = slot?.startAt ?? booking.sessionStartAt;
  const sessionEndAt = slot?.endAt ?? null;
  if (!sessionStartAt) notFound();

  const isCanceled = booking.status === "canceled";
  const isVoided = booking.status === "voided";
  const sessionInactive = isCanceled || isVoided;
  const canShowChange = change === "1" && !sessionInactive;

  const [trainerSettings, trainer, calendar] = await Promise.all([
    getTrainerSettings(booking.trainerId),
    getTrainerById(booking.trainerId),
    !sessionInactive
      ? getBookingCalendarPayload(token)
      : Promise.resolve(null),
  ]);

  const durationMinutes =
    sessionEndAt != null
      ? Math.round(
          (wallClockToUtcMs(sessionEndAt, trainerSettings.timezone) -
            wallClockToUtcMs(sessionStartAt, trainerSettings.timezone)) /
            60_000,
        )
      : 60;

  const blockedByDeadline = slot
    ? isWithinBookingDeadline(
        slot.startAt,
        trainerSettings.cancelDeadlineHours,
        trainerSettings.timezone,
      )
    : true;

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <Link
        href={`/c/${client.token}`}
        className="inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← Home
      </Link>

      <div>
        <p className="text-sm text-slate-500">Your session</p>
        <h1 className="text-2xl font-bold">
          {formatSlot(sessionStartAt, sessionEndAt)}
        </h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {isCanceled ? (
            <Badge tone="danger">Canceled</Badge>
          ) : isVoided ? (
            <Badge tone="danger">Voided</Badge>
          ) : null}
          {!isVoided &&
            (booking.isRecurring ? (
              <Badge tone="success">Recurring</Badge>
            ) : (
              <Badge>Manual</Badge>
            ))}
        </div>
      </div>

      {!canShowChange && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Hi {client.name}, here are your session details.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Duration:</span>{" "}
              {formatDurationMinutes(durationMinutes)}
            </p>
            <p>
              <span className="font-medium">Trainer:</span>{" "}
              {trainer?.name ?? "Your trainer"}
            </p>
            {calendar?.event.location ? (
              <p>
                <span className="font-medium">Location:</span>{" "}
                {calendar.event.location}
              </p>
            ) : null}
          </div>
          {!sessionInactive && calendar ? (
            <AddToCalendarButton
              options={calendar.options}
              sessionLabel={formatSlot(sessionStartAt, sessionEndAt)}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button disabled variant="secondary">
              Pay (soon)
            </Button>
          </div>
          {!sessionInactive && (
            <SessionActions
              bookingToken={token}
              clientHomeToken={client.token}
              blockedByDeadline={blockedByDeadline}
              cancelDeadlineHours={trainerSettings.cancelDeadlineHours}
            />
          )}
        </div>
      )}

      {canShowChange && (
        <ChangeSessionFlow
          bookingToken={token}
          clientHomeToken={client.token}
          currentSlotLabel={formatSlot(sessionStartAt)}
          bookingWindowWeeks={trainerSettings.clientBookingWindowWeeks}
        />
      )}

      {isCanceled && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">This session has been canceled.</p>
          <Link
            href={`/c/${client.token}`}
            className="inline-block text-sm font-medium text-slate-900 hover:underline"
          >
            Back to home
          </Link>
        </div>
      )}

      {isVoided && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            This session was voided by your trainer and no longer counts.
          </p>
          <Link
            href={`/c/${client.token}`}
            className="inline-block text-sm font-medium text-slate-900 hover:underline"
          >
            Back to home
          </Link>
        </div>
      )}
    </main>
  );
}
