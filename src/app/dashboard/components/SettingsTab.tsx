"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, InlineNotice } from "@/components/ui";
import { TRAINER_TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from "@/lib/constants";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import { LocationsSection } from "./LocationsSection";
import type { TrainerSettings } from "../types";

export function SettingsTab({
  settings,
  onSaved,
  onLocationsChanged,
}: {
  settings: TrainerSettings | null;
  onSaved: () => void;
  onLocationsChanged: () => void;
}) {
  const [scheduleStartTime, setScheduleStartTime] = useState("07:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("21:00");
  const [scheduleDefaultView, setScheduleDefaultView] = useState<"day" | "week">("day");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState("36");
  const [lastMinuteOfferLockHours, setLastMinuteOfferLockHours] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setScheduleStartTime(settings.scheduleStartTime);
      setScheduleEndTime(settings.scheduleEndTime);
      setScheduleDefaultView(settings.scheduleDefaultView);
      setTimezone(settings.timezone);
      setCancelDeadlineHours(String(settings.cancelDeadlineHours));
      setLastMinuteOfferLockHours(String(settings.lastMinuteOfferLockHours));
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
          scheduleStartTime,
          scheduleEndTime,
          scheduleDefaultView,
          timezone,
          cancelDeadlineHours: Number(cancelDeadlineHours),
          lastMinuteOfferLockHours: Number(lastMinuteOfferLockHours),
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
    <div className="space-y-6">
      <Card>
        <h2 className="font-semibold">Settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          General preferences for your booking app.
        </p>

        <form onSubmit={save} className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-slate-900">Time zone</h3>
            <p className="mt-1 text-sm text-slate-500">
              Used for WhatsApp message timestamps and other times shown in your
              dashboard.
            </p>
            <label className="mt-3 flex max-w-md flex-col gap-1 text-sm">
              <span className="text-slate-600">Time zone</span>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
              >
                {!TRAINER_TIMEZONE_OPTIONS.some((opt) => opt.value === timezone) && (
                  <option value={timezone}>{timezone}</option>
                )}
                {TRAINER_TIMEZONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-900">Schedule hours</h3>
            <p className="mt-1 text-sm text-slate-500">
              Only show these hours on the weekly schedule. Times before the start or
              from the end time onward are hidden.
            </p>
            <div className="mt-3 flex flex-wrap gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">Start time</span>
                <input
                  type="time"
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={scheduleStartTime}
                  onChange={(e) => setScheduleStartTime(e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">End time</span>
                <input
                  type="time"
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  value={scheduleEndTime}
                  onChange={(e) => setScheduleEndTime(e.target.value)}
                  required
                />
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-900">Default schedule view</h3>
            <p className="mt-1 text-sm text-slate-500">
              Which layout to show first when you open the Schedule tab. You can still
              switch between day and week at any time.
            </p>
            <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {(["day", "week"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setScheduleDefaultView(mode)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition ${
                    scheduleDefaultView === mode
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-900">
              Change &amp; cancellation threshold
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Clients cannot change or cancel a session within this many hours of
              the start time. Trainers can override this per booking from the
              Sessions tab.
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

          <div>
            <h3 className="text-sm font-medium text-slate-900">Last-minute offers</h3>
            <p className="mt-1 text-sm text-slate-500">
              When you send a last-minute offer, the slot is reserved for that client
              for this many hours before you can offer it to someone else.
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

          {error && <InlineNotice tone="error">{error}</InlineNotice>}
          {saved && <InlineNotice tone="success">Settings saved.</InlineNotice>}

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-slate-900">Weekly templates</h3>
        <p className="mt-1 text-sm text-slate-500">
          Define reusable weekly slot patterns and apply them to your schedule.
        </p>
        <Link href="/dashboard/settings/templates">
          <Button type="button" variant="secondary" className="mt-4">
            Manage templates →
          </Button>
        </Link>
      </Card>

      <LocationsSection onChanged={onLocationsChanged} />
    </div>
  );
}
