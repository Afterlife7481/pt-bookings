"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

export default function AddClientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sessionPrice, setSessionPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, sessionPrice }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to add client");
      return;
    }

    router.push(`/dashboard/clients/${data.id}`);
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-4 sm:p-6">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Add client</h1>
        <p className="text-sm text-slate-500">Create a new client profile</p>
      </div>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Name</span>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jamie Smith"
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
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Session price (£)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={sessionPrice}
              onChange={(e) => setSessionPrice(e.target.value)}
              placeholder="50.00"
            />
          </label>
          <p className="text-sm text-slate-500">
            Clients manage last-minute alerts from their portal link.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Add client"}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </main>
  );
}
