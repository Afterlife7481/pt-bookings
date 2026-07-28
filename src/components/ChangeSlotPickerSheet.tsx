"use client";

import { SheetModal } from "@/components/SheetModal";
import {
  AvailableSlotsWeekPicker,
  type AvailablePickerSlot,
} from "@/components/AvailableSlotsWeekPicker";

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
          onSelect={onSelect}
          disabled={disabled || busy}
          busy={busy}
        />
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </SheetModal>
  );
}
