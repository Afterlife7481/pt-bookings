"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { parseLocalDateTime } from "@/lib/constants";
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
  const [loading, setLoading] = useState(prefetchedClients == null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slotInPast = parseLocalDateTime(slotStartAt).getTime() < Date.now();

  useEffect(() => {
    setHoldExpiresAt(lastMinute.holdExpiresAt);
    setOffers(lastMinute.offers);
    setHeldClientName(lastMinute.heldClientName);
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
  }, [slotId]);

  useEffect(() => {
    if (prefetchedClients != null) return;
    loadEligible();
  }, [loadEligible, prefetchedClients]);

  async function sendOffer(clientId: string) {
    setBusyKey(clientId);
    setError(null);
    const res = await fetch("/api/last-minute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, clientId }),
    });
    const body = await res.json();
    setBusyKey(null);
    if (!res.ok) {
      setError(body.error ?? "Failed to send offer");
      return;
    }
    await onOfferSent();
    await loadEligible();
  }

  return (
    <div className="border-b border-slate-100 pb-4">
      <h3 className="text-sm font-medium text-slate-900">Last-minute offers</h3>
      <p className="mt-1 text-xs text-slate-500">
        Send to opted-in clients who match this day and time. Each offer locks
        the slot for {lockHours} hour{lockHours === 1 ? "" : "s"}.
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
                    </p>
                  </div>
                  <Button
                    disabled={
                      slotInPast || hasActiveOffer || busyKey === client.id
                    }
                    className="px-3 py-1.5 text-xs"
                    onClick={() => sendOffer(client.id)}
                  >
                    {busyKey === client.id
                      ? "Sending…"
                      : slotInPast
                        ? "Past slot"
                        : hasActiveOffer
                          ? "Held"
                          : "Send offer"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
