"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { SheetModal } from "@/components/SheetModal";
import { cn } from "@/lib/utils";

export function MarkSessionPaidModal({
  open,
  busy,
  paymentMethods,
  initialPaymentType,
  mode = "mark",
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  paymentMethods: { id: string; name: string }[];
  initialPaymentType: string | null;
  mode?: "mark" | "edit";
  onClose: () => void;
  onConfirm: (paymentType: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(initialPaymentType);

  useEffect(() => {
    if (open) {
      setSelected(initialPaymentType);
    }
  }, [open, initialPaymentType]);

  if (!open) return null;

  const title = mode === "edit" ? "Change payment method" : "Mark as paid";
  const confirmLabel = mode === "edit" ? "Save" : "Mark as paid";

  return (
    <SheetModal
      title={title}
      subtitle="Choose how the client paid for this session."
      onClose={onClose}
      footer={
        <Button
          disabled={!selected || busy}
          className="w-full"
          onClick={() => selected && onConfirm(selected)}
        >
          {confirmLabel}
        </Button>
      }
    >
      {paymentMethods.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Add payment methods in{" "}
          <a
            href="/dashboard/settings/payment"
            className="underline hover:text-slate-800"
          >
            Settings → Payment details
          </a>
          .
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {paymentMethods.map((option) => {
            const isSelected = selected === option.name;
            return (
              <button
                key={option.id}
                type="button"
                disabled={busy}
                onClick={() => setSelected(option.name)}
                className={cn(
                  "min-w-0 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  busy && "opacity-60",
                )}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      )}
    </SheetModal>
  );
}
