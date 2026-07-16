"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { SendInvoiceChannelSheet } from "@/components/SendInvoiceChannelSheet";
import { SessionWhen } from "@/components/SessionWhen";
import { HubGroup, HubRowLink } from "@/components/hub-ui";
import { useMounted } from "@/lib/use-mounted";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { isWallClockPast } from "@/lib/zoned-time";
import {
  prepareWhatsAppOpen,
  prepareWhatsAppOpenForPhone,
} from "@/lib/whatsapp-link";
import type { NotifyChannel } from "@/lib/notify-channels";
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
          {booking.isRecurring ? <Badge>Recurring</Badge> : null}
          {isCanceled ? <Badge tone="danger">Canceled</Badge> : null}
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

  const [showPortalSheet, setShowPortalSheet] = useState(false);
  const [sendingPortal, setSendingPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalNotice, setPortalNotice] = useState<string | null>(null);

  const mounted = useMounted();

  async function sendPortalLink(channels: NotifyChannel[]) {
    if (!client) return;
    const wantWhatsApp = channels.includes("whatsapp");
    let waOpen: ReturnType<typeof prepareWhatsAppOpen> | null = null;
    if (wantWhatsApp) {
      const prepared = prepareWhatsAppOpenForPhone(client.phone);
      if (!prepared.ok) {
        setPortalError(prepared.error);
        return;
      }
      waOpen = prepared.opener;
    }

    setSendingPortal(true);
    setPortalError(null);
    setPortalNotice(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/portal-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      });
      const data = await res.json();
      setSendingPortal(false);
      if (!res.ok) {
        waOpen?.finish(null);
        setPortalError(data.error ?? "Failed to send portal link");
        return;
      }

      setShowPortalSheet(false);
      if (wantWhatsApp) {
        if (
          typeof data.whatsappUrl === "string" &&
          data.whatsappUrl.length > 0
        ) {
          waOpen?.finish(data.whatsappUrl);
        } else {
          waOpen?.finish(null);
          setPortalError(
            "Portal link logged, but WhatsApp could not open. Check the client phone number.",
          );
          return;
        }
      }

      const via = Array.isArray(data.sentVia)
        ? data.sentVia.join(" and ")
        : channels.join(" and ");
      setPortalNotice(`Portal link sent via ${via}.`);
    } catch {
      waOpen?.finish(null);
      setSendingPortal(false);
      setPortalError("Failed to send portal link");
    }
  }

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

      <Card>
        <h2 className="font-semibold">Client portal</h2>
        <p className="mt-1 text-sm text-slate-600">
          Share this link so the client can view sessions, book, and manage
          bookings.
        </p>
        <a
          className="mt-3 inline-block break-all text-sm text-blue-600 underline"
          href={client.portalUrl}
          target="_blank"
          rel="noreferrer"
        >
          {client.portalUrl}
        </a>
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPortalError(null);
              setShowPortalSheet(true);
            }}
          >
            Send to client
          </Button>
        </div>
        {portalNotice && (
          <p className="mt-2 text-sm text-green-700">{portalNotice}</p>
        )}
        {portalError && !showPortalSheet && (
          <p className="mt-2 text-sm text-red-600">{portalError}</p>
        )}
      </Card>

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

      {showPortalSheet && (
        <SendInvoiceChannelSheet
          clientName={client.name}
          email={client.email}
          phone={client.phone}
          preferredNotifyChannel={client.preferredNotifyChannel}
          busy={sendingPortal}
          error={portalError}
          title="Send portal link"
          subtitle={`Choose how to send the portal link to ${client.name}.`}
          onClose={() => {
            if (!sendingPortal) setShowPortalSheet(false);
          }}
          onSend={sendPortalLink}
        />
      )}
    </div>
  );
}
