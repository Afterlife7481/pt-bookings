"use client";

import { Button } from "@/components/ui";
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
  onConfirm,
  busy = false,
  disabled = false,
  error = null,
  subtitle,
  confirmLabel = "Confirm new time",
}: {
  slots: AvailablePickerSlot[];
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  disabled?: boolean;
  error?: string | null;
  subtitle?: string;
  confirmLabel?: string;
}) {
  return (
    <SheetModal
      title="Pick a new time"
      subtitle={subtitle}
      size="wide"
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <Button
          className="w-full"
          disabled={disabled || busy || !selectedSlotId}
          onClick={onConfirm}
        >
          {busy ? "Changing…" : confirmLabel}
        </Button>
      }
    >
      <div className="mt-4">
        <AvailableSlotsWeekPicker
          slots={slots}
          selectedSlotId={selectedSlotId}
          onSelect={onSelect}
          disabled={disabled || busy}
        />
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </SheetModal>
  );
}
