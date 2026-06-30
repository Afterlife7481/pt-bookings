"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { SheetModal } from "@/components/SheetModal";
import {
  SESSION_PAYMENT_TYPES,
  type SessionPaymentType,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MarkSessionPaidModal({
  open,
  busy,
  initialPaymentType,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  initialPaymentType: SessionPaymentType | null;
  onClose: () => void;
  onConfirm: (paymentType: SessionPaymentType) => void;
}) {
  const [selected, setSelected] = useState<SessionPaymentType | null>(
    initialPaymentType,
  );

  useEffect(() => {
    if (open) {
      setSelected(initialPaymentType);
    }
  }, [open, initialPaymentType]);

  if (!open) return null;

  return (
    <SheetModal
      title="Mark as paid"
      subtitle="Choose how the client paid for this session."
      onClose={onClose}
      footer={
        <>
          <Button
            disabled={!selected || busy}
            className="w-full"
            onClick={() => selected && onConfirm(selected)}
          >
            Mark as paid
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
        </>
      }
    >
      <div className="mt-4 grid grid-cols-2 gap-2">
        {SESSION_PAYMENT_TYPES.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={busy}
              onClick={() => setSelected(option.value)}
              className={cn(
                "min-w-0 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                isSelected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                busy && "opacity-60",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </SheetModal>
  );
}
