"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { formatBookingWindowWeeks } from "@/lib/constants";
import type { TrainerBookingDetail } from "@/lib/services/bookings";
import { formatTimeOnly, groupSlotsByDay } from "@/lib/utils";

type SlotOption = {
  id: string;
  startAt: string;
  locationName: string | null;
  locationAddress: string | null;
};

export function TrainerChangeSessionSection({
  bookingId,
  disabled,
  onChanged,
  onClose,
}: {
  bookingId: string;
  disabled?: boolean;
  onChanged: (detail: TrainerBookingDetail) => void;
  onClose: () => void;
}) {
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [bookingWindowWeeks, setBookingWindowWeeks] = useState(3);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/change-slots`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to load available slots");
      setSlots([]);
      return;
    }
    setSlots(data.slots ?? []);
    setBookingWindowWeeks(data.bookingWindowWeeks ?? 3);
    setSelectedSlot(null);
  }, [bookingId]);

  useEffect(() => {
    loadSlots().catch(() => {
      setLoading(false);
      setError("Failed to load available slots");
    });
  }, [loadSlots]);

  async function confirmChange() {
    if (!selectedSlot) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_slot", toSlotId: selectedSlot }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to change session");
      return;
    }
    onChanged(data);
    onClose();
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">Pick a new time</p>
        <button
          type="button"
          className="text-sm text-slate-500 hover:text-slate-900"
          disabled={busy}
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading available slots…</p>
      ) : slots.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          No open slots at this client&apos;s enabled locations in{" "}
          {formatBookingWindowWeeks(bookingWindowWeeks)}. Add slots on the
          schedule or enable locations on the client profile.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
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
                    } ${disabled || busy ? "opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      name="change-slot"
                      value={slot.id}
                      checked={selectedSlot === slot.id}
                      disabled={disabled || busy}
                      onChange={() => setSelectedSlot(slot.id)}
                    />
                    <div>
                      <span className="text-sm font-medium tabular-nums">
                        {formatTimeOnly(slot.startAt)}
                      </span>
                      {slot.locationName && (
                        <p className="text-sm text-slate-600">{slot.locationName}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {slots.length > 0 && (
        <Button
          className="mt-3 w-full sm:w-auto"
          disabled={disabled || busy || !selectedSlot}
          onClick={confirmChange}
        >
          {busy ? "Changing…" : "Confirm new time"}
        </Button>
      )}
    </div>
  );
}
