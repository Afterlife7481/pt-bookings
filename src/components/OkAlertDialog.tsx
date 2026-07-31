"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui";

/** Simple centered alert with an Ok action (no Close/X control). */
export function OkAlertDialog({
  message,
  onOk,
  okLabel = "Ok",
}: {
  message: string;
  onOk: () => void;
  okLabel?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label={okLabel}
        className="absolute inset-0 bg-black/40"
        onClick={onOk}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-describedby="ok-alert-message"
        className="relative z-10 w-full max-w-sm rounded-xl bg-white p-5 shadow-lg"
      >
        <p id="ok-alert-message" className="text-sm text-slate-800">
          {message}
        </p>
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={onOk} className="min-w-[5.5rem]">
            {okLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
