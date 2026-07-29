"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui";
import { formatCreatedDate } from "@/lib/utils";
import { WHATSAPP_PHONE_HINT } from "@/lib/whatsapp-link";
import { ClientPageHeader } from "../ClientPageHeader";
import { useClientSubpage } from "../useClientSubpage";

export default function ClientDetailsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { client, loading, notFound, setClient } = useClientSubpage(clientId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!client) return;
    setName(client.name);
    setEmail(client.email);
    setPhone(client.phone);
  }, [client]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone }),
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
        title="Client details"
        clientName={client.name}
        backHref={`/dashboard/clients/${clientId}`}
        backLabel={client.name}
      />

      <form onSubmit={saveDetails} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-slate-600">Name</span>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Email</span>
            <input
              type="email"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Phone</span>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+447700900000"
            />
            <span className="text-xs text-slate-500">
              Phone or email required. {WHATSAPP_PHONE_HINT}
            </span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && (
          <p className="text-sm text-green-700">Client details saved.</p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </Button>
      </form>

      <p className="text-xs text-slate-400">
        Added {formatCreatedDate(client.createdAt)}
      </p>
    </div>
  );
}
