"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { parseLocalDateTime } from "@/lib/constants";
import type { LastMinuteOfferPreview } from "@/lib/services/last-minute";
import { formatDurationMinutes, formatSlot } from "@/lib/utils";

function formatOfferExpiry(expiresAt: string): string {
  const date = parseLocalDateTime(expiresAt);
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LastMinuteOfferClaim({
  slotId,
  clientId,
  preview,
}: {
  slotId: string;
  clientId: string;
  preview: LastMinuteOfferPreview;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationMinutes = Math.round(
    (parseLocalDateTime(preview.slotEndAt).getTime() -
      parseLocalDateTime(preview.slotStartAt).getTime()) /
      60_000,
  );

  async function acceptOffer() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/client/last-minute/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, clientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to accept offer");
        return;
      }
      router.push(`/s/${data.token}`);
    } catch {
      setError("Failed to accept offer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <Link
        href={`/c/${preview.clientToken}`}
        className="inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← All my sessions
      </Link>

      <div>
        <p className="text-sm text-slate-500">Last-minute opening</p>
        <h1 className="text-2xl font-bold">Confirm your session</h1>
      </div>

      <Card>
        <p className="text-sm text-slate-600">
          Hi {preview.clientName}, your trainer has offered you this last-minute
          slot. Review the details below and accept to book it.
        </p>

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">When</dt>
            <dd className="font-medium text-slate-900">
              {formatSlot(preview.slotStartAt, preview.slotEndAt)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Duration</dt>
            <dd>{formatDurationMinutes(durationMinutes)}</dd>
          </div>
          {preview.locationName && (
            <div>
              <dt className="text-slate-500">Location</dt>
              <dd>{preview.locationName}</dd>
            </div>
          )}
          {preview.expiresAt && (
            <div>
              <dt className="text-slate-500">Accept before</dt>
              <dd>{formatOfferExpiry(preview.expiresAt)}</dd>
            </div>
          )}
        </dl>

        {preview.canAccept ? (
          <div className="mt-6 space-y-3">
            <Button
              className="w-full py-3"
              disabled={busy}
              onClick={() => void acceptOffer()}
            >
              {busy ? "Booking…" : "Accept session"}
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        ) : (
          <p className="mt-4 text-sm text-red-600">
            {preview.unavailableReason ??
              "This offer is no longer available."}
          </p>
        )}
      </Card>
    </main>
  );
}
