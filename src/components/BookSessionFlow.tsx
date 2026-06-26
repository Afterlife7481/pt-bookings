"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { formatTimeOnly, groupSlotsByDay } from "@/lib/utils";

type Slot = { id: string; startAt: string };

export function BookSessionFlow({
  clientToken,
  slots,
}: {
  clientToken: string;
  slots: Slot[];
}) {
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmBooking() {
    if (!selectedSlot) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/client-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientToken, slotId: selectedSlot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/s/${data.token}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to book session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Book a session</h2>
      <p className="mt-1 text-sm text-slate-600">
        Pick an open slot within the next 2 weeks.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 space-y-4">
        {slots.length === 0 ? (
          <p className="text-sm text-slate-500">No open slots available right now.</p>
        ) : (
          groupSlotsByDay(slots).map((group) => (
            <div key={group.dateKey}>
              <h3 className="text-sm font-medium text-slate-900">{group.label}</h3>
              <div className="mt-2 space-y-2">
                {group.slots.map((slot) => (
                  <label
                    key={slot.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                      selectedSlot === slot.id
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="slot"
                      value={slot.id}
                      checked={selectedSlot === slot.id}
                      onChange={() => setSelectedSlot(slot.id)}
                    />
                    <span className="text-sm tabular-nums">
                      {formatTimeOnly(slot.startAt)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={confirmBooking} disabled={!selectedSlot || loading}>
          {loading ? "Booking…" : "Confirm booking"}
        </Button>
        <Link href={`/c/${clientToken}`}>
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>
    </Card>
  );
}
