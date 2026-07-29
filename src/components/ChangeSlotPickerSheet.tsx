"use client";

import { SheetModal } from "@/components/SheetModal";
import {
  AvailableSlotsWeekPicker,
  type AvailablePickerSlot,
} from "@/components/AvailableSlotsWeekPicker";
import { formatSlotLabel } from "@/lib/constants";

export function ChangeSlotPickerSheet({
  slots,
  selectedSlotId,
  onSelect,
  onClose,
  busy = false,
  disabled = false,
  error = null,
  subtitle,
}: {
  slots: AvailablePickerSlot[];
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
  onClose: () => void;
  busy?: boolean;
  disabled?: boolean;
  error?: string | null;
  subtitle?: string;
}) {
  function handleSelect(slotId: string) {
    if (busy || disabled) return;
    const slot = slots.find((s) => s.id === slotId);
    const label = slot
      ? `${formatSlotLabel(slot.startAt)}${
          slot.locationName ? ` · ${slot.locationName}` : ""
        }`
      : "this time";
    if (!window.confirm(`Move this session to ${label}?`)) return;
    onSelect(slotId);
  }

  return (
    <SheetModal
      title="Pick a new time"
      subtitle={subtitle}
      size="wide"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="mt-4">
        <AvailableSlotsWeekPicker
          slots={slots}
          selectedSlotId={selectedSlotId}
          onSelect={handleSelect}
          disabled={disabled || busy}
          busy={busy}
        />
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </SheetModal>
  );
}
