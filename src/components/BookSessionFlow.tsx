"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AvailableSlotsWeekPicker,
  type AvailablePickerSlot,
} from "@/components/AvailableSlotsWeekPicker";
import { formatBookingWindowWeeks, formatSlotLabel } from "@/lib/constants";

export function BookSessionFlow({
  clientToken,
  slots,
  bookingWindowWeeks,
  showHeader = true,
}: {
  clientToken: string;
  slots: AvailablePickerSlot[];
  bookingWindowWeeks: number;
  showHeader?: boolean;
}) {
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function bookSlot(slotId: string) {
    setSelectedSlot(slotId);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/client-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientToken, slotId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/s/${data.token}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to book session");
      setLoading(false);
    }
  }

  function handleSelect(slotId: string) {
    if (loading) return;
    const slot = slots.find((s) => s.id === slotId);
    const label = slot
      ? `${formatSlotLabel(slot.startAt)}${
          slot.locationName ? ` · ${slot.locationName}` : ""
        }`
      : "this time";
    if (
      !window.confirm(
        `Book ${label}?\n\nWe'll check it's still available before saving.`,
      )
    ) {
      return;
    }
    void bookSlot(slotId);
  }

  return (
    <div className="space-y-4">
      {showHeader ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Book a session</h2>
            <p className="mt-1 text-sm text-slate-600">
              Pick an open slot within{" "}
              {formatBookingWindowWeeks(bookingWindowWeeks)}. We&apos;ll confirm
              it&apos;s still available before saving.
            </p>
          </div>
          <Link
            href={`/c/${clientToken}`}
            className="shrink-0 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Cancel
          </Link>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          Tap an open slot within {formatBookingWindowWeeks(bookingWindowWeeks)}.
          We&apos;ll confirm it&apos;s still available before saving.
        </p>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {slots.length === 0 ? (
        <p className="text-sm text-slate-500">
          No open slots at your locations right now.
        </p>
      ) : (
        <AvailableSlotsWeekPicker
          slots={slots}
          selectedSlotId={selectedSlot}
          onSelect={handleSelect}
          disabled={loading}
          busy={loading}
        />
      )}
    </div>
  );
}
