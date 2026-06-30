import Link from "next/link";
import { ensureDb } from "@/lib/db/init";
import { getBookingByToken } from "@/lib/services/bookings";
import { getTrainerSettings } from "@/lib/services/settings";
import { Card, Badge, Button } from "@/components/ui";
import { formatSlot, formatDurationMinutes } from "@/lib/utils";
import { isWithinBookingDeadline, isInactiveBookingStatus, parseLocalDateTime } from "@/lib/constants";
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
  const data = await getBookingByToken(token);

  if (!data || !data.client) notFound();

  const { booking, slot, client } = data;
  const sessionStartAt = slot?.startAt ?? booking.sessionStartAt;
  const sessionEndAt = slot?.endAt ?? null;
  if (!sessionStartAt) notFound();

  const durationMinutes =
    sessionEndAt != null
      ? Math.round(
          (parseLocalDateTime(sessionEndAt).getTime() -
            parseLocalDateTime(sessionStartAt).getTime()) /
            60_000,
        )
      : 60;

  const trainerSettings = await getTrainerSettings(booking.trainerId);
  const blockedByDeadline = slot
    ? isWithinBookingDeadline(
        slot.startAt,
        trainerSettings.cancelDeadlineHours,
      )
    : true;
  const isInactive = isInactiveBookingStatus(booking.status);
  const isCanceled = booking.status === "canceled";
  const isVoided = booking.status === "voided";

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <Link
        href={`/c/${client.token}`}
        className="inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← All my sessions
      </Link>

      <div>
        <p className="text-sm text-slate-500">Your session</p>
        <h1 className="text-2xl font-bold">
          {formatSlot(sessionStartAt, sessionEndAt)}
        </h1>
        <div className="mt-2 flex gap-2">
          <Badge tone={booking.status === "booked" ? "success" : "warning"}>
            {booking.status === "booked"
              ? "Booked"
              : booking.status === "pending_change"
                ? "Changing"
                : booking.status === "canceled"
                  ? "Canceled"
                  : booking.status === "voided"
                    ? "Voided"
                    : booking.status}
          </Badge>
          {booking.isRecurring && <Badge>Recurring</Badge>}
        </div>
      </div>

      <Card>
        <p className="text-sm text-slate-600">Hi {client.name}, here are your session details.</p>
        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-medium">Duration:</span>{" "}
            {formatDurationMinutes(durationMinutes)}
          </p>
          <p><span className="font-medium">Trainer:</span> Alex Trainer</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled variant="secondary">Add to calendar (soon)</Button>
          <Button disabled variant="secondary">Pay (soon)</Button>
        </div>
        {change !== "1" &&
          booking.status !== "pending_change" &&
          !isInactive && (
            <SessionActions
              bookingToken={token}
              clientHomeToken={client.token}
              blockedByDeadline={blockedByDeadline}
              cancelDeadlineHours={trainerSettings.cancelDeadlineHours}
            />
          )}
      </Card>

      {(change === "1" || booking.status === "pending_change") && !isInactive && (
        <ChangeSessionFlow
          bookingToken={token}
          clientHomeToken={client.token}
          currentSlotLabel={formatSlot(sessionStartAt)}
          bookingWindowWeeks={trainerSettings.clientBookingWindowWeeks}
        />
      )}

      {isCanceled && (
        <Card>
          <p className="text-sm text-slate-600">This session has been canceled.</p>
          <Link
            href={`/c/${client.token}`}
            className="mt-3 inline-block text-sm font-medium text-slate-900 hover:underline"
          >
            Back to all sessions
          </Link>
        </Card>
      )}

      {isVoided && (
        <Card>
          <p className="text-sm text-slate-600">
            This session was voided by your trainer and no longer counts.
          </p>
          <Link
            href={`/c/${client.token}`}
            className="mt-3 inline-block text-sm font-medium text-slate-900 hover:underline"
          >
            Back to all sessions
          </Link>
        </Card>
      )}
    </main>
  );
}
