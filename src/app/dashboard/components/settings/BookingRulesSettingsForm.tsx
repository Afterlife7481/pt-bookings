"use client";

import { useEffect, useState } from "react";
import { Button, InlineNotice } from "@/components/ui";
import {
  MAX_CLIENT_BOOKING_WINDOW_WEEKS,
  MIN_CLIENT_BOOKING_WINDOW_WEEKS,
} from "@/lib/constants";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import type { TrainerSettings } from "../../types";

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            value === option.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function BookingRulesSettingsForm({
  settings,
  onSaved,
}: {
  settings: TrainerSettings | null;
  onSaved: () => void;
}) {
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState("36");
  const [lastMinuteOfferLockHours, setLastMinuteOfferLockHours] = useState("1");
  const [bookingWindowPreset, setBookingWindowPreset] = useState<
    "1" | "2" | "3" | "custom"
  >("2");
  const [customBookingWindowWeeks, setCustomBookingWindowWeeks] = useState("4");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setCancelDeadlineHours(String(settings.cancelDeadlineHours));
      setLastMinuteOfferLockHours(String(settings.lastMinuteOfferLockHours));
      const weeks = settings.clientBookingWindowWeeks;
      if (weeks === 1 || weeks === 2 || weeks === 3) {
        setBookingWindowPreset(String(weeks) as "1" | "2" | "3");
      } else {
        setBookingWindowPreset("custom");
        setCustomBookingWindowWeeks(String(weeks));
      }
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
          cancelDeadlineHours: Number(cancelDeadlineHours),
          lastMinuteOfferLockHours: Number(lastMinuteOfferLockHours),
          clientBookingWindowWeeks:
            bookingWindowPreset === "custom"
              ? Number(customBookingWindowWeeks)
              : Number(bookingWindowPreset),
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
    <form onSubmit={save} className="space-y-8">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-slate-700">Client booking window</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Which calendar weeks clients can book or change into. This week always
            counts as one — e.g. 2 weeks means this week and next week.
          </p>
          <div className="mt-3">
            <SegmentedControl
              label="Client booking window"
              value={bookingWindowPreset}
              onChange={setBookingWindowPreset}
              options={[
                { value: "1", label: "1 week" },
                { value: "2", label: "2 weeks" },
                { value: "3", label: "3 weeks" },
                { value: "custom", label: "Custom" },
              ]}
            />
          </div>
          {bookingWindowPreset === "custom" && (
            <label className="mt-3 flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Weeks</span>
              <input
                type="number"
                min={MIN_CLIENT_BOOKING_WINDOW_WEEKS}
                max={MAX_CLIENT_BOOKING_WINDOW_WEEKS}
                step={1}
                className="w-32 rounded-lg border border-slate-300 px-3 py-2"
                value={customBookingWindowWeeks}
                onChange={(e) => setCustomBookingWindowWeeks(e.target.value)}
                required
              />
            </label>
          )}
        </div>

        <div className="border-t border-slate-100 pt-6">
          <p className="text-sm font-medium text-slate-700">
            Change &amp; cancellation threshold
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Clients cannot change or cancel within this many hours of the session
            start.
          </p>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Hours before session</span>
            <input
              type="number"
              min={1}
              max={168}
              step={1}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2"
              value={cancelDeadlineHours}
              onChange={(e) => setCancelDeadlineHours(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="border-t border-slate-100 pt-6">
          <p className="text-sm font-medium text-slate-700">Last-minute offers</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            How long a slot stays reserved for one client after you send a
            last-minute offer.
          </p>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Offer lock (hours)</span>
            <input
              type="number"
              min={1}
              max={72}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2"
              value={lastMinuteOfferLockHours}
              onChange={(e) => setLastMinuteOfferLockHours(e.target.value)}
              required
            />
          </label>
        </div>
      </div>

      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      {saved && <InlineNotice tone="success">Booking rules saved.</InlineNotice>}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
