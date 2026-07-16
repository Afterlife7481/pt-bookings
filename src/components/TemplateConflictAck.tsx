"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import type { ScheduleConflictPreview } from "@/lib/services/template-conflicts";

export function TemplateConflictAck({
  token,
  preview,
}: {
  token: string;
  preview: ScheduleConflictPreview;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(preview.alreadyAcknowledged);

  async function acknowledge() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/client/template-conflict/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to acknowledge");
        return;
      }
      setAcknowledged(true);
      if (data.clientToken) {
        router.push(`/c/${data.clientToken}`);
      }
    } catch {
      setError("Failed to acknowledge");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg space-y-4 p-6">
      <Link
        href={`/c/${preview.clientToken}`}
        className="inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← Home
      </Link>

      <div>
        <p className="text-sm text-slate-500">Schedule update</p>
        <h1 className="text-2xl font-bold">Session cannot be booked</h1>
      </div>

      <Card>
        <p className="text-sm text-slate-600">
          Hi {preview.clientName}, your trainer cannot book your regular session
          on {preview.slotLabel}
          {preview.holidayLabel ? ` (${preview.holidayLabel})` : ""}.
          Please confirm you have received this message.
        </p>

        {preview.locationName ? (
          <p className="mt-3 text-sm text-slate-600">
            Location: <span className="font-medium">{preview.locationName}</span>
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {acknowledged ? (
          <p className="mt-4 text-sm font-medium text-green-700">
            Thank you — your acknowledgement has been recorded.
          </p>
        ) : (
          <Button
            className="mt-4"
            disabled={busy}
            onClick={() => void acknowledge()}
          >
            {busy ? "Confirming…" : "I understand — confirm"}
          </Button>
        )}
      </Card>
    </main>
  );
}
