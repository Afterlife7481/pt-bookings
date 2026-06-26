"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { formatTimeOnly, groupSlotsByDay } from "@/lib/utils";

type Slot = { id: string; startAt: string };

export function ChangeSessionFlow({
  bookingToken,
  currentSlotLabel,
}: {
  bookingToken: string;
  currentSlotLabel: string;
}) {
  const router = useRouter();
  const [changeRequestId, setChangeRequestId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  async function startChange() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", bookingToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChangeRequestId(data.changeRequestId);
      setSlots(data.availableSlots);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start change");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    startChange();
  }, [bookingToken]);

  async function confirmChange() {
    if (!changeRequestId || !selectedSlot) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          changeRequestId,
          toSlotId: selectedSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace(`/s/${bookingToken}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm change");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Loading available slots…</p>
      </Card>
    );
  }

  if (error && !changeRequestId) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Change session</h2>
        <p className="mt-3 text-sm text-red-600">{error}</p>
        <Link href={`/s/${bookingToken}`} className="mt-4 inline-block">
          <Button variant="ghost">Back to session</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Pick a new time</h2>
      <p className="mt-1 text-sm text-slate-600">
        Current session: {currentSlotLabel}
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 space-y-4">
        {slots.length === 0 ? (
          <p className="text-sm text-slate-500">No available slots in the next 2 weeks.</p>
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
        <Button
          onClick={confirmChange}
          disabled={!selectedSlot || loading}
        >
          Confirm new time
        </Button>
        <Link href={`/s/${bookingToken}`}>
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>
    </Card>
  );
}
