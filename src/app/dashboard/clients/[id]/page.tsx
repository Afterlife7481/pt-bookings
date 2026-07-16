"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { SessionWhen } from "@/components/SessionWhen";
import { HubGroup, HubRowLink } from "@/components/hub-ui";
import { useMounted } from "@/lib/use-mounted";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { isWallClockPast } from "@/lib/zoned-time";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";
import { ClientPageHeader } from "./ClientPageHeader";
import { useClientSubpage } from "./useClientSubpage";
import type { ClientBooking } from "./client-types";

function ClientSessionRow({
  booking,
  clientId,
}: {
  booking: ClientBooking;
  clientId: string;
}) {
  const isCanceled = booking.status === "canceled";

  return (
    <li>
      <Link
        href={`/dashboard/sessions/${booking.id}?from=client&clientId=${clientId}`}
        className="flex items-center justify-between gap-3 py-3 transition hover:bg-slate-50"
      >
        <SessionWhen
          startAt={booking.slotStartAt}
          endAt={booking.slotEndAt}
          className="text-sm"
        />
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {isCanceled ? <Badge tone="danger">Canceled</Badge> : null}
          {booking.isRecurring ? (
            <Badge tone="success">Recurring</Badge>
          ) : (
            <Badge>Manual</Badge>
          )}
          <span aria-hidden className="text-slate-400">
            ›
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { settings } = useTrainerSettings();
  const { client, loading, notFound } = useClientSubpage(clientId);
  const mounted = useMounted();

  if (loading) {
    return <p className="text-sm text-slate-500">Loading client…</p>;
  }

  if (notFound || !client) {
    return (
      <div className="space-y-4">
        <ClientPageHeader title="Client not found" />
        <Card>
          <p className="text-slate-600">This client could not be found.</p>
        </Card>
      </div>
    );
  }

  const now = mounted ? Date.now() : null;
  const timeZone = settings?.timezone || DEFAULT_TIMEZONE;
  const upcoming =
    now === null
      ? []
      : client.bookings.filter(
          (b) =>
            b.status !== "canceled" &&
            !isWallClockPast(b.slotStartAt, timeZone),
        );
  const past =
    now === null
      ? []
      : client.bookings.filter(
          (b) =>
            b.status === "canceled" ||
            isWallClockPast(b.slotStartAt, timeZone),
        );

  return (
    <div className="space-y-6">
      <ClientPageHeader clientName={client.name} />

      <HubGroup>
        <HubRowLink
          href={`/dashboard/clients/${client.id}/details`}
          title="Client details"
        />
        <HubRowLink
          href={`/dashboard/clients/${client.id}/settings`}
          title="Client settings"
        />
        <HubRowLink
          href={`/dashboard/clients/${client.id}/portal`}
          title="Client portal"
        />
        <HubRowLink
          href={`/dashboard/clients/${client.id}/notes/public`}
          title="Public notes"
        />
        <HubRowLink
          href={`/dashboard/clients/${client.id}/notes/private`}
          title="Private notes"
        />
        <HubRowLink
          href={`/dashboard/clients/${client.id}/recurring`}
          title="Recurring slots"
        />
      </HubGroup>

      <Card>
        <h2 className="font-semibold">Upcoming sessions</h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No upcoming sessions.</p>
        ) : (
          <ul className="mt-1 divide-y divide-slate-100">
            {upcoming.map((b) => (
              <ClientSessionRow key={b.id} booking={b} clientId={client.id} />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">Past sessions</h2>
        {past.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No past sessions.</p>
        ) : (
          <ul className="mt-1 divide-y divide-slate-100">
            {past.map((b) => (
              <ClientSessionRow key={b.id} booking={b} clientId={client.id} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
