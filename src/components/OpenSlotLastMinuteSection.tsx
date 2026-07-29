"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { SendInvoiceChannelSheet } from "@/components/SendInvoiceChannelSheet";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { isWallClockPast } from "@/lib/zoned-time";
import { useTrainerSettings } from "@/app/dashboard/hooks/useTrainerSettings";
import type { NotifyChannel } from "@/lib/notify-channels";
import {
  prepareWhatsAppOpen,
  prepareWhatsAppOpenForPhone,
} from "@/lib/whatsapp-link";
import type {
  ScheduleEligibleClient,
  ScheduleLastMinuteInfo,
  ScheduleLastMinuteOffer,
} from "@/lib/services/schedule-types";

type EligibleClient = ScheduleEligibleClient;

function formatHoldExpiry(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OpenSlotLastMinuteSection({
  slotId,
  slotStartAt,
  lastMinute,
  lockHours,
  onOfferSent,
}: {
  slotId: string;
  slotStartAt: string;
  lastMinute: ScheduleLastMinuteInfo;
  lockHours: number;
  onOfferSent: () => void | Promise<void>;
}) {
  const prefetchedClients = lastMinute.eligibleClients;
  const [clients, setClients] = useState<EligibleClient[]>(
    prefetchedClients ?? [],
  );
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(
    lastMinute.holdExpiresAt,
  );
  const [offers, setOffers] = useState<ScheduleLastMinuteOffer[]>(
    lastMinute.offers,
  );
  const [heldClientName, setHeldClientName] = useState<string | null>(
    lastMinute.heldClientName,
  );
  const [heldForClientId, setHeldForClientId] = useState<string | null>(
    lastMinute.heldForClientId,
  );
  const [loading, setLoading] = useState(prefetchedClients == null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerTarget, setOfferTarget] = useState<EligibleClient | null>(null);
  const { settings } = useTrainerSettings();
  const timeZone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const slotInPast = isWallClockPast(slotStartAt, timeZone);
  const slotHeldForOther =
    Boolean(heldForClientId) &&
    Boolean(holdExpiresAt) &&
    new Date(holdExpiresAt!).getTime() > Date.now();

  useEffect(() => {
    setHoldExpiresAt(lastMinute.holdExpiresAt);
    setOffers(lastMinute.offers);
    setHeldClientName(lastMinute.heldClientName);
    setHeldForClientId(lastMinute.heldForClientId);
    if (lastMinute.eligibleClients != null) {
      setClients(lastMinute.eligibleClients);
      setLoading(false);
    }
  }, [lastMinute]);

  const loadEligible = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/last-minute/${slotId}`);
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to load clients");
      return;
    }
    setClients(body.clients);
    setHoldExpiresAt(body.holdExpiresAt);
    setHeldForClientId(body.heldClientId ?? null);
  }, [slotId]);

  useEffect(() => {
    if (prefetchedClients != null) return;
    loadEligible();
  }, [loadEligible, prefetchedClients]);

  async function sendOffer(channels: NotifyChannel[]) {
    if (!offerTarget) return;
    const wantWhatsApp = channels.includes("whatsapp");
    let waOpen: ReturnType<typeof prepareWhatsAppOpen> | null = null;
    if (wantWhatsApp) {
      const prepared = prepareWhatsAppOpenForPhone(offerTarget.phone);
      if (!prepared.ok) {
        setError(prepared.error);
        return;
      }
      waOpen = prepared.opener;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/last-minute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          clientId: offerTarget.id,
          channels,
        }),
      });
      const body = await res.json();
      setBusy(false);
      if (!res.ok) {
        waOpen?.finish(null);
        setError(body.error ?? "Failed to send offer");
        return;
      }
      setOfferTarget(null);
      if (wantWhatsApp) {
        if (
          typeof body.whatsappUrl === "string" &&
          body.whatsappUrl.length > 0
        ) {
          waOpen?.finish(body.whatsappUrl);
        } else {
          waOpen?.finish(null);
          setError(
            "Offer logged, but WhatsApp could not open. Check the client phone number.",
          );
        }
      }
      await onOfferSent();
      await loadEligible();
    } catch {
      waOpen?.finish(null);
      setBusy(false);
      setError("Failed to send offer");
    }
  }

  return (
    <div className="border-b border-slate-100 pb-4">
      <h3 className="text-sm font-medium text-slate-900">Last-minute offers</h3>
      <p className="mt-1 text-xs text-slate-500">
        Send to opted-in clients who match this day and time. Each offer locks
        the slot for {lockHours} hour{lockHours === 1 ? "" : "s"} — you cannot
        offer it to someone else until that hold expires.
      </p>

      {slotInPast && (
        <p className="mt-2 text-sm text-slate-500">
          Last-minute offers cannot be sent for past slots.
        </p>
      )}

      {heldClientName && holdExpiresAt && (
        <p className="mt-2 text-sm text-purple-700">
          Held for {heldClientName} until {formatHoldExpiry(holdExpiresAt)}
        </p>
      )}

      {offers.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Offer history
          </p>
          <ul className="mt-1 space-y-1 text-sm text-slate-600">
            {offers.map((offer) => (
              <li key={offer.id}>
                {offer.clientName} — {offer.status}
                {offer.expiresAt && offer.status === "offered"
                  ? ` (until ${formatHoldExpiry(offer.expiresAt)})`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading eligible clients…</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-slate-500">
            No opted-in clients match this day and time.
          </p>
        ) : (
          <ul className="space-y-2">
            {clients.map((client) => {
              const hasActiveOffer =
                client.isHeld && client.latestOffer?.status === "offered";
              const blockedByOtherHold =
                slotHeldForOther && heldForClientId !== client.id;
              const disabled =
                slotInPast ||
                hasActiveOffer ||
                blockedByOtherHold ||
                busy;

              return (
                <li
                  key={client.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-slate-500">
                      {client.phone}
                      {client.isHeld ? " · currently held" : ""}
                      {client.latestOffer?.status === "offered"
                        ? " · offer active"
                        : ""}
                      {blockedByOtherHold ? " · slot held for someone else" : ""}
                    </p>
                  </div>
                  <Button
                    disabled={disabled}
                    className="px-3 py-1.5 text-xs"
                    onClick={() => {
                      setError(null);
                      setOfferTarget(client);
                    }}
                  >
                    {slotInPast
                      ? "Past slot"
                      : hasActiveOffer
                        ? "Held"
                        : blockedByOtherHold
                          ? "Unavailable"
                          : "Send offer"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {offerTarget ? (
        <SendInvoiceChannelSheet
          clientName={offerTarget.name}
          email={offerTarget.email}
          phone={offerTarget.phone}
          preferredNotifyChannel={offerTarget.preferredNotifyChannel}
          busy={busy}
          error={error}
          title="Send last-minute offer"
          subtitle={`Choose how to send the offer to ${offerTarget.name}.`}
          emptyHint="Add an email or a valid mobile number on this client's profile before sending an offer."
          showCancel={false}
          onClose={() => {
            if (!busy) {
              setOfferTarget(null);
              setError(null);
            }
          }}
          onSend={sendOffer}
        />
      ) : null}
    </div>
  );
}
