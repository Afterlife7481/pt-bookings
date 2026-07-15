"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { SheetModal } from "@/components/SheetModal";
import {
  canNotifyByWhatsApp,
  channelsFromInvoiceChoice,
  defaultInvoiceChoice,
  hasClientEmail,
  type NotifyChannel,
  type PreferredNotifyChannel,
} from "@/lib/notify-channels";

export function SendInvoiceChannelSheet({
  clientName,
  email,
  phone,
  preferredNotifyChannel,
  busy,
  error,
  onClose,
  onSend,
}: {
  clientName: string;
  email: string;
  phone: string;
  preferredNotifyChannel?: PreferredNotifyChannel | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSend: (channels: NotifyChannel[]) => void | Promise<void>;
}) {
  const canEmail = hasClientEmail(email);
  const canWhatsApp = canNotifyByWhatsApp(phone);

  const defaultChoice = useMemo(
    () =>
      defaultInvoiceChoice({
        preferred: preferredNotifyChannel,
        canEmail,
        canWhatsApp,
      }),
    [preferredNotifyChannel, canEmail, canWhatsApp],
  );

  const [choice, setChoice] = useState(defaultChoice);

  const canSend = choice != null && !busy;

  return (
    <SheetModal
      title="Send invoice"
      subtitle={`Choose how to send the invoice to ${clientName}.`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!canSend}
            onClick={() => {
              if (!choice) return;
              void onSend(channelsFromInvoiceChoice(choice));
            }}
          >
            {busy ? "Sending…" : "Send"}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {!canEmail && !canWhatsApp ? (
          <p className="text-sm text-amber-800" role="status">
            Add an email or a valid mobile number on this client&apos;s profile
            before sending an invoice.
          </p>
        ) : null}

        {preferredNotifyChannel ? (
          <p className="text-xs text-slate-500">
            Preferred on profile:{" "}
            {preferredNotifyChannel === "email" ? "Email" : "WhatsApp"}
            {preferredNotifyChannel === "email" && !canEmail
              ? " (email missing — pick another option)"
              : null}
            {preferredNotifyChannel === "whatsapp" && !canWhatsApp
              ? " (phone missing — pick another option)"
              : null}
          </p>
        ) : null}

        <fieldset className="space-y-2" disabled={busy}>
          <legend className="sr-only">Send channel</legend>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 ${
              canEmail
                ? "border-slate-200 hover:border-slate-300"
                : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
            }`}
          >
            <input
              type="radio"
              name="invoice-channel"
              className="mt-1"
              disabled={!canEmail}
              checked={choice === "email"}
              onChange={() => setChoice("email")}
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">
                Send by email
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {canEmail
                  ? email.trim()
                  : "No email saved for this client"}
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 ${
              canWhatsApp
                ? "border-slate-200 hover:border-slate-300"
                : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
            }`}
          >
            <input
              type="radio"
              name="invoice-channel"
              className="mt-1"
              disabled={!canWhatsApp}
              checked={choice === "whatsapp"}
              onChange={() => setChoice("whatsapp")}
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">
                Send by WhatsApp
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {canWhatsApp
                  ? `${phone.trim()} — opens WhatsApp on this device with the message ready`
                  : "No valid mobile number for WhatsApp"}
              </span>
            </span>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 ${
              canEmail && canWhatsApp
                ? "border-slate-200 hover:border-slate-300"
                : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
            }`}
          >
            <input
              type="radio"
              name="invoice-channel"
              className="mt-1"
              disabled={!canEmail || !canWhatsApp}
              checked={choice === "both"}
              onChange={() => setChoice("both")}
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">
                Email and WhatsApp
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {canEmail && canWhatsApp
                  ? "Email now, then open WhatsApp so you can send from your number"
                  : "Needs both an email and a valid mobile number"}
              </span>
            </span>
          </label>
        </fieldset>

        {canWhatsApp ? (
          <p className="text-xs text-slate-500">
            WhatsApp must be available on this device (app or WhatsApp Web). We
            cannot detect that automatically.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </SheetModal>
  );
}
