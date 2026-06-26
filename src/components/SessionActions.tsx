"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function SessionActions({
  bookingToken,
  clientHomeToken,
  blockedByDeadline,
  cancelDeadlineHours,
}: {
  bookingToken: string;
  clientHomeToken: string;
  blockedByDeadline: boolean;
  cancelDeadlineHours: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelSession() {
    if (
      !window.confirm(
        "Cancel this session? The slot will become available for other clients.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_by_token",
          bookingToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.clientHomeToken) {
        router.push(`/c/${data.clientHomeToken}`);
      } else {
        router.push(`/c/${clientHomeToken}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {blockedByDeadline ? (
          <Button disabled>Change session</Button>
        ) : (
          <Link href={`/s/${bookingToken}?change=1`}>
            <Button>Change session</Button>
          </Link>
        )}
        <Button
          variant="secondary"
          disabled={blockedByDeadline || loading}
          onClick={cancelSession}
        >
          {loading ? "Canceling…" : "Cancel session"}
        </Button>
      </div>
      {blockedByDeadline && (
        <p className="mt-3 text-sm text-slate-500">
          Changes and cancellations are not allowed within {cancelDeadlineHours}{" "}
          hours of your session unless your trainer allows it. Please contact
          your trainer.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
