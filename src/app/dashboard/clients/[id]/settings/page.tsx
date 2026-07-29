"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui";
import { currencySymbol, DEFAULT_CURRENCY } from "@/lib/currency";
import { sessionPriceToInput } from "@/lib/utils";
import type { PreferredNotifyChannel } from "@/lib/notify-channels";
import { useTrainerSettings } from "../../../hooks/useTrainerSettings";
import { ClientLocationsSection } from "../../../components/ClientLocationsSection";
import { ClientPageHeader } from "../ClientPageHeader";
import { useClientSubpage } from "../useClientSubpage";

export default function ClientSettingsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { settings } = useTrainerSettings();
  const currency = settings?.currency || DEFAULT_CURRENCY;
  const priceSymbol = currencySymbol(currency);
  const { client, loading, notFound, setClient } = useClientSubpage(clientId);

  const [preferredNotifyChannel, setPreferredNotifyChannel] =
    useState<PreferredNotifyChannel>("whatsapp");
  const [sessionPrice, setSessionPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!client) return;
    setPreferredNotifyChannel(
      client.preferredNotifyChannel === "email" ? "email" : "whatsapp",
    );
    setSessionPrice(sessionPriceToInput(client.sessionPrice, currency));
  }, [client, currency]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferredNotifyChannel,
        sessionPrice,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      return;
    }

    setClient(data);
    setSaved(true);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (notFound || !client) {
    return (
      <div className="space-y-4">
        <ClientPageHeader backHref="/dashboard/clients" backLabel="Clients" />
        <p className="text-slate-600">Client not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientPageHeader
        title="Client settings"
        clientName={client.name}
        backHref={`/dashboard/clients/${clientId}`}
        backLabel={client.name}
      />

      <form onSubmit={saveSettings} className="space-y-4">
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="font-semibold text-slate-900">
            Communication preference
          </legend>
          <p className="text-xs text-slate-500">
            Used as the default when sending invoices and confirmations. You can
            still choose the other channel each time.
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="preferred-notify-channel"
                checked={preferredNotifyChannel === "email"}
                onChange={() => setPreferredNotifyChannel("email")}
              />
              <span>Email</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="preferred-notify-channel"
                checked={preferredNotifyChannel === "whatsapp"}
                onChange={() => setPreferredNotifyChannel("whatsapp")}
              />
              <span>WhatsApp</span>
            </label>
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-slate-900">
            Session price ({priceSymbol})
          </span>
          <p className="text-xs text-slate-500">
            Default price used for this client&apos;s sessions and invoices.
          </p>
          <input
            type="number"
            min="0"
            step="0.01"
            className="mt-1 max-w-xs rounded-lg border border-slate-300 px-3 py-2"
            value={sessionPrice}
            onChange={(e) => setSessionPrice(e.target.value)}
            placeholder="50.00"
          />
        </label>

        <p className="text-sm text-slate-500">
          Last-minute alerts are managed by the client from their portal link.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && (
          <p className="text-sm text-green-700">Client settings saved.</p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </form>

      <ClientLocationsSection clientId={clientId} showHeading />
    </div>
  );
}
