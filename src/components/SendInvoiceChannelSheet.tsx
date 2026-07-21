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
  title = "Send invoice",
  subtitle,
  emptyHint = "Add an email and a phone number on this client's profile before sending.",
}: {
  clientName: string;
  email: string;
  phone: string;
  preferredNotifyChannel?: PreferredNotifyChannel | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSend: (channels: NotifyChannel[]) => void | Promise<void>;
  title?: string;
  subtitle?: string;
  emptyHint?: string;
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
  const resolvedSubtitle =
    subtitle ?? `Choose how to send the invoice to ${clientName}.`;

  return (
    <SheetModal
      title={title}
      subtitle={resolvedSubtitle}
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
            {emptyHint}
          </p>
        ) : null}

        {canEmail && canWhatsApp && preferredNotifyChannel ? (
          <p className="text-xs text-slate-500">
            Preferred on profile:{" "}
            {preferredNotifyChannel === "email" ? "Email" : "WhatsApp"}
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
              name="notify-channel"
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
              name="notify-channel"
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
