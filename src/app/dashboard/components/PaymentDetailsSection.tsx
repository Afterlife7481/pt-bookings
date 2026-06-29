"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, InlineNotice } from "@/components/ui";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import type { TrainerSettings } from "../types";

const COMING_SOON_INTEGRATIONS = [
  "Connect your Stripe account",
  "Connect your Revolut invoicing",
  "Connect your Sterling account invoicing",
] as const;

export function PaymentDetailsSection({
  settings,
  onSaved,
}: {
  settings: TrainerSettings | null;
  onSaved: () => void;
}) {
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [paymentPayeeName, setPaymentPayeeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setBankAccountNumber(settings.bankAccountNumber ?? "");
      setBankSortCode(settings.bankSortCode ?? "");
      setBankName(settings.bankName ?? "");
      setPaymentPayeeName(settings.paymentPayeeName ?? "");
    }
  }, [settings]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await fetchJson("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountNumber,
          bankSortCode,
          bankName,
          paymentPayeeName,
        }),
      });
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">Payment details</h2>
      <p className="mt-1 text-sm text-slate-600">
        Bank details for clients paying by transfer. These can be shared when you
        send payment requests.
      </p>

      <form onSubmit={save} className="mt-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-slate-900">Payee</h3>
          <p className="mt-1 text-sm text-slate-500">
            Shown on payment requests. Leave blank to use your trainer name.
          </p>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Company / trainer name</span>
            <input
              type="text"
              autoComplete="organization"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={paymentPayeeName}
              onChange={(e) => setPaymentPayeeName(e.target.value)}
              placeholder={settings?.name ?? "Your business or trainer name"}
            />
          </label>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-900">Bank transfer</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-slate-600">Bank name</span>
              <input
                type="text"
                autoComplete="off"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Barclays"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Account number</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="12345678"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Sort code</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={bankSortCode}
                onChange={(e) => setBankSortCode(e.target.value)}
                placeholder="12-34-56"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-sm font-medium text-slate-900">Integrations</h3>
          <p className="mt-1 text-sm text-slate-500">
            Online payment and invoicing connections.
          </p>
          <ul className="mt-4 space-y-2">
            {COMING_SOON_INTEGRATIONS.map((label) => (
              <li
                key={label}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
              >
                <span className="text-sm text-slate-700">{label}</span>
                <Badge>Coming soon</Badge>
              </li>
            ))}
          </ul>
        </div>

        {error && <InlineNotice tone="error">{error}</InlineNotice>}
        {saved && <InlineNotice tone="success">Payment details saved.</InlineNotice>}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save payment details"}
        </Button>
      </form>
    </Card>
  );
}
