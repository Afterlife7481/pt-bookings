"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ChangeSlotPickerSheet } from "@/components/ChangeSlotPickerSheet";
import { formatBookingWindowWeeks } from "@/lib/constants";

type Slot = {
  id: string;
  startAt: string;
  locationName: string | null;
  locationAddress: string | null;
};

export function ChangeSessionFlow({
  bookingToken,
  clientHomeToken,
  currentSlotLabel,
  bookingWindowWeeks,
}: {
  bookingToken: string;
  clientHomeToken: string;
  currentSlotLabel: string;
  bookingWindowWeeks: number;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [noSlotsAvailable, setNoSlotsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  async function loadAvailableSlots() {
    setInitialLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", bookingToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlots(data.availableSlots ?? []);
      setNoSlotsAvailable(Boolean(data.noSlotsAvailable));
      if ((data.availableSlots ?? []).length > 0) {
        setShowPicker(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load available times");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    void loadAvailableSlots();
  }, [bookingToken]);

  async function cancelSession() {
    if (
      !window.confirm(
        "Cancel this session? The slot will become available for other clients.",
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/client/sessions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/c/${data.clientHomeToken ?? clientHomeToken}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel session");
    } finally {
      setBusy(false);
    }
  }

  async function selectAndSave(slotId: string) {
    if (busy) return;
    setSelectedSlot(slotId);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          bookingToken,
          toSlotId: slotId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace(`/s/${bookingToken}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm change");
      setBusy(false);
      // Reload slots in case the chosen time was taken.
      void loadAvailableSlots();
    }
  }

  if (initialLoading) {
    return <p className="text-sm text-slate-600">Loading available times…</p>;
  }

  if (error && slots.length === 0 && !noSlotsAvailable) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Change session</h2>
          <p className="mt-3 text-sm text-red-600">{error}</p>
        </div>
        <Link href={`/s/${bookingToken}`} className="inline-block">
          <Button variant="ghost">Back to session</Button>
        </Link>
      </div>
    );
  }

  if (noSlotsAvailable) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">No other times available</h2>
          <p className="mt-1 text-sm text-slate-600">
            Current session: {currentSlotLabel}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            There are no open slots at your locations in{" "}
            {formatBookingWindowWeeks(bookingWindowWeeks)}. Keep your current
            time or cancel this session.
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/s/${bookingToken}`}>
            <Button disabled={busy}>Keep current time</Button>
          </Link>
          <Button variant="danger" disabled={busy} onClick={cancelSession}>
            {busy ? "Canceling…" : "Cancel session"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Change session</h2>
            <p className="mt-1 text-sm text-slate-600">
              Current session: {currentSlotLabel}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Pick a new time from the schedule. We&apos;ll confirm it&apos;s
              still available before saving.
            </p>
          </div>
          <Link
            href={`/s/${bookingToken}`}
            className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Cancel
          </Link>
        </div>
        {error && !showPicker && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {!showPicker ? (
          <Button
            disabled={busy}
            onClick={() => {
              setError(null);
              setShowPicker(true);
            }}
          >
            Pick a new time
          </Button>
        ) : null}
      </div>

      {showPicker && (
        <ChangeSlotPickerSheet
          slots={slots}
          selectedSlotId={selectedSlot}
          onSelect={selectAndSave}
          onClose={() => {
            if (!busy) router.replace(`/s/${bookingToken}`);
          }}
          busy={busy}
          error={error}
          subtitle={`Current session: ${currentSlotLabel}`}
        />
      )}
    </>
  );
}
