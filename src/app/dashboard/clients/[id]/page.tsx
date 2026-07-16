"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { SendInvoiceChannelSheet } from "@/components/SendInvoiceChannelSheet";
import { HubGroup, HubRowLink } from "@/components/hub-ui";
import { formatSlot, formatCreatedDate, sessionPriceToInput } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { currencySymbol, DEFAULT_CURRENCY } from "@/lib/currency";
import { isWallClockPast } from "@/lib/zoned-time";
import {
  prepareWhatsAppOpen,
  prepareWhatsAppOpenForPhone,
  WHATSAPP_PHONE_HINT,
} from "@/lib/whatsapp-link";
import type { NotifyChannel, PreferredNotifyChannel } from "@/lib/notify-channels";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";
import { ClientPageHeader } from "./ClientPageHeader";
import type { ClientDetail } from "./client-types";

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { settings } = useTrainerSettings();
  const currency = settings?.currency || DEFAULT_CURRENCY;
  const priceSymbol = currencySymbol(currency);

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredNotifyChannel, setPreferredNotifyChannel] =
    useState<PreferredNotifyChannel>("whatsapp");
  const [sessionPrice, setSessionPrice] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSaved, setDetailsSaved] = useState(false);

  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [bookingActionError, setBookingActionError] = useState<string | null>(
    null,
  );

  const [showPortalSheet, setShowPortalSheet] = useState(false);
  const [sendingPortal, setSendingPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalNotice, setPortalNotice] = useState<string | null>(null);

  const mounted = useMounted();

  const loadClient = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data: ClientDetail = await res.json();
    setClient(data);
    setName(data.name);
    setEmail(data.email);
    setPhone(data.phone);
    setPreferredNotifyChannel(
      data.preferredNotifyChannel === "email" ? "email" : "whatsapp",
    );
    setSessionPrice(sessionPriceToInput(data.sessionPrice, currency));
    setLoading(false);
  }, [clientId, currency]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsError(null);
    setDetailsSaved(false);

    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone,
        preferredNotifyChannel,
        sessionPrice,
      }),
    });
    const data = await res.json();
    setSavingDetails(false);

    if (!res.ok) {
      setDetailsError(data.error ?? "Failed to save");
      return;
    }

    setClient(data);
    setDetailsSaved(true);
  }

  async function sendPortalLink(channels: NotifyChannel[]) {
    const wantWhatsApp = channels.includes("whatsapp");
    let waOpen: ReturnType<typeof prepareWhatsAppOpen> | null = null;
    if (wantWhatsApp) {
      const prepared = prepareWhatsAppOpenForPhone(phone);
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

  async function sendSessionWhatsApp(bookingId: string) {
    const prepared = prepareWhatsAppOpenForPhone(phone);
    if (!prepared.ok) {
      setBookingActionError(prepared.error);
      return;
    }
    const waOpen = prepared.opener;
    setBusyBookingId(bookingId);
    setBookingActionError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_confirmation", bookingId }),
      });
      const data = await res.json();
      setBusyBookingId(null);
      if (!res.ok) {
        waOpen.finish(null);
        setBookingActionError(data.error ?? "Failed to prepare message");
        return;
      }
      if (typeof data.whatsappUrl === "string" && data.whatsappUrl.length > 0) {
        waOpen.finish(data.whatsappUrl);
      } else {
        waOpen.finish(null);
        setBookingActionError(
          data.error ??
            "Add or check this client's phone number before sending on WhatsApp.",
        );
      }
      await loadClient();
    } catch {
      waOpen.finish(null);
      setBusyBookingId(null);
      setBookingActionError("Failed to prepare message");
    }
  }

  async function cancelSession(bookingId: string) {
    if (!window.confirm("Cancel this session?")) return;
    setBusyBookingId(bookingId);
    setBookingActionError(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", bookingId }),
    });
    const data = await res.json();
    setBusyBookingId(null);
    if (!res.ok) {
      setBookingActionError(data.error ?? "Failed to cancel session");
      return;
    }
    await loadClient();
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
        <h2 className="font-semibold">Details</h2>
        <form onSubmit={saveDetails} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Name</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Email</span>
              <input
                type="email"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Phone</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+447700900000"
              />
              <span className="text-xs text-slate-500">
                Phone or email required. {WHATSAPP_PHONE_HINT}
              </span>
            </label>
            <fieldset className="flex flex-col gap-2 text-sm sm:col-span-2">
              <legend className="text-slate-600">Communication preference</legend>
              <p className="text-xs text-slate-500">
                Used as the default when sending invoices and portal links. You
                can still choose the other channel (or both) each time.
              </p>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="preferred-notify-channel"
                    checked={preferredNotifyChannel === "whatsapp"}
                    onChange={() => setPreferredNotifyChannel("whatsapp")}
                  />
                  <span>WhatsApp</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="preferred-notify-channel"
                    checked={preferredNotifyChannel === "email"}
                    onChange={() => setPreferredNotifyChannel("email")}
                  />
                  <span>Email</span>
                </label>
              </div>
            </fieldset>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">
                Session price ({priceSymbol})
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={sessionPrice}
                onChange={(e) => setSessionPrice(e.target.value)}
                placeholder="50.00"
              />
            </label>
          </div>

          <p className="text-sm text-slate-500">
            Last-minute alerts are managed by the client from their portal link.
          </p>

          {detailsError && <p className="text-sm text-red-600">{detailsError}</p>}
          {detailsSaved && (
            <p className="text-sm text-green-700">Client details saved.</p>
          )}

          <Button type="submit" disabled={savingDetails}>
            {savingDetails ? "Saving…" : "Save details"}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">Client portal link</p>
          <a
            className="mt-1 inline-block break-all text-sm text-blue-600 underline"
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
          <p className="mt-2 text-xs text-slate-400">
            Added {formatCreatedDate(client.createdAt)}
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Upcoming sessions</h2>
        {bookingActionError && (
          <p className="mt-2 text-sm text-red-600">{bookingActionError}</p>
        )}
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No upcoming sessions.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {upcoming.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatSlot(b.slotStartAt, b.slotEndAt)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge>{b.status}</Badge>
                    {b.isRecurring && <Badge>Recurring</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/dashboard/sessions/${b.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Session
                  </Link>
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    disabled={busyBookingId === b.id}
                    onClick={() => sendSessionWhatsApp(b.id)}
                  >
                    {busyBookingId === b.id ? "Sending…" : "Send message"}
                  </Button>
                  <Button
                    variant="danger"
                    className="px-3 py-1.5 text-xs"
                    disabled={busyBookingId === b.id}
                    onClick={() => cancelSession(b.id)}
                  >
                    Cancel session
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">Past sessions</h2>
        {past.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No past sessions.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {past.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatSlot(b.slotStartAt, b.slotEndAt)}
                  </p>
                  <Badge>{b.status}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/dashboard/sessions/${b.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Session
                  </Link>
                  {b.status !== "canceled" && (
                    <a
                      className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
                      href={`/s/${b.token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Client link
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <HubGroup>
        <HubRowLink
          href={`/dashboard/clients/${client.id}/notes`}
          title="Notes"
        />
        <HubRowLink
          href={`/dashboard/clients/${client.id}/locations`}
          title="Locations"
        />
        <HubRowLink
          href={`/dashboard/clients/${client.id}/recurring`}
          title="Recurring slots"
        />
      </HubGroup>

      {showPortalSheet && (
        <SendInvoiceChannelSheet
          clientName={client.name}
          email={email}
          phone={phone}
          preferredNotifyChannel={preferredNotifyChannel}
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
