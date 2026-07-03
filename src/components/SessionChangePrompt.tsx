"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";

export function SessionChangePrompt({
  bookingToken,
}: {
  bookingToken: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function keepCurrentTime() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "abort", bookingToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to keep current time");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Change in progress</h2>
      <p className="mt-1 text-sm text-slate-600">
        You started changing this session. Pick a new time or keep your current
        booking.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/s/${bookingToken}?change=1`}>
          <Button disabled={busy}>Change session</Button>
        </Link>
        <Button variant="secondary" disabled={busy} onClick={keepCurrentTime}>
          {busy ? "Saving…" : "Keep current time"}
        </Button>
      </div>
    </Card>
  );
}
