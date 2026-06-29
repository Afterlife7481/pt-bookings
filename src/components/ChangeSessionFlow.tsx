"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { formatBookingWindowWeeks } from "@/lib/constants";
import { formatTimeOnly, groupSlotsByDay } from "@/lib/utils";

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

  async function confirmChange() {
    if (!changeRequestId || !selectedSlot) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          changeRequestId,
          toSlotId: selectedSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace(`/s/${bookingToken}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm change");
    } finally {
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
    <Card>
      <h2 className="text-lg font-semibold">Pick a new time</h2>
      <p className="mt-1 text-sm text-slate-600">
        Current session: {currentSlotLabel}
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 space-y-4">
        {groupSlotsByDay(slots).map((group) => (
          <div key={group.dateKey}>
            <h3 className="text-sm font-medium text-slate-900">{group.label}</h3>
            <div className="mt-2 space-y-2">
              {group.slots.map((slot) => (
                <label
                  key={slot.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                    selectedSlot === slot.id
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="slot"
                    value={slot.id}
                    checked={selectedSlot === slot.id}
                    onChange={() => setSelectedSlot(slot.id)}
                  />
                  <div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatTimeOnly(slot.startAt)}
                    </span>
                    {slot.locationName && (
                      <p className="text-sm text-slate-600">{slot.locationName}</p>
                    )}
                    {slot.locationAddress && (
                      <p className="text-xs text-slate-500">{slot.locationAddress}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={confirmChange} disabled={!selectedSlot || busy}>
          Confirm new time
        </Button>
        <Button variant="secondary" disabled={busy} onClick={keepCurrentTime}>
          Keep current time
        </Button>
      </div>
    </Card>
  );
}
