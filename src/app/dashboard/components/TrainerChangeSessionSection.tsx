"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { SheetModal } from "@/components/SheetModal";
import { ChangeSlotPickerSheet } from "@/components/ChangeSlotPickerSheet";
import { formatBookingWindowWeeks } from "@/lib/constants";
import type { TrainerBookingDetail } from "@/lib/services/bookings";

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

  async function selectAndSave(slotId: string) {
    if (busy || disabled) return;
    setSelectedSlot(slotId);
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_slot", toSlotId: slotId }),
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

  if (loading) {
    return (
      <SheetModal title="Pick a new time" size="wide" onClose={onClose}>
        <p className="mt-4 text-sm text-slate-500">Loading available slots…</p>
      </SheetModal>
    );
  }

  if (slots.length === 0) {
    return (
      <SheetModal
        title="Pick a new time"
        size="wide"
        onClose={onClose}
        footer={
          <Button className="w-full" variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <p className="mt-4 text-sm text-slate-600">
          No open slots at this client&apos;s enabled locations in{" "}
          {formatBookingWindowWeeks(bookingWindowWeeks)}. Add slots on the
          schedule or enable locations on the client profile.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </SheetModal>
    );
  }

  return (
    <ChangeSlotPickerSheet
      slots={slots}
      selectedSlotId={selectedSlot}
      onSelect={selectAndSave}
      onClose={onClose}
      busy={busy}
      disabled={disabled}
      error={error}
    />
  );
}
