"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
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
  const [changeRequestId, setChangeRequestId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [noSlotsAvailable, setNoSlotsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  async function startChange() {
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
      setChangeRequestId(data.changeRequestId);
      setSlots(data.availableSlots ?? []);
      setNoSlotsAvailable(Boolean(data.noSlotsAvailable));
      if ((data.availableSlots ?? []).length > 0) {
        setShowPicker(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start change");
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    startChange();
  }, [bookingToken]);

  async function keepCurrentTime() {
    setBusy(true);
    setError(null);
    try {
      if (changeRequestId) {
        const res = await fetch("/api/change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "abort", bookingToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      router.replace(`/s/${bookingToken}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to keep current time");
    } finally {
      setBusy(false);
    }
  }

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
    if (!changeRequestId || busy) return;
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
          changeRequestId,
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
    }
  }

  if (initialLoading) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Loading available slots…</p>
      </Card>
    );
  }

  if (error && !changeRequestId && !noSlotsAvailable) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Change session</h2>
        <p className="mt-3 text-sm text-red-600">{error}</p>
        <Link href={`/s/${bookingToken}`} className="mt-4 inline-block">
          <Button variant="ghost">Back to session</Button>
        </Link>
      </Card>
    );
  }

  if (noSlotsAvailable) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">No other times available</h2>
        <p className="mt-1 text-sm text-slate-600">
          Current session: {currentSlotLabel}
        </p>
        <p className="mt-3 text-sm text-slate-600">
          There are no open slots at your locations in{" "}
          {formatBookingWindowWeeks(bookingWindowWeeks)}. Keep your current time
          or cancel this session.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy} onClick={keepCurrentTime}>
            Keep current time
          </Button>
          <Button variant="danger" disabled={busy} onClick={cancelSession}>
            {busy ? "Canceling…" : "Cancel session"}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Change session</h2>
            <p className="mt-1 text-sm text-slate-600">
              Current session: {currentSlotLabel}
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
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={busy}
            onClick={() => {
              setError(null);
              setShowPicker(true);
            }}
          >
            Pick a new time
          </Button>
          <Button variant="secondary" disabled={busy} onClick={keepCurrentTime}>
            Keep current time
          </Button>
        </div>
      </Card>

      {showPicker && (
        <ChangeSlotPickerSheet
          slots={slots}
          selectedSlotId={selectedSlot}
          onSelect={selectAndSave}
          onClose={() => {
            if (!busy) setShowPicker(false);
          }}
          busy={busy}
          error={error}
          subtitle={`Current session: ${currentSlotLabel}`}
        />
      )}
    </>
  );
}
