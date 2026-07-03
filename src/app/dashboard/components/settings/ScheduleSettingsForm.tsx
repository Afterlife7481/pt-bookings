"use client";

import { useEffect, useState } from "react";
import { Button, InlineNotice } from "@/components/ui";
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

export function ScheduleSettingsForm({
  settings,
  onSaved,
}: {
  settings: TrainerSettings | null;
  onSaved: () => void;
}) {
  const [scheduleStartTime, setScheduleStartTime] = useState("07:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("21:00");
  const [scheduleDefaultView, setScheduleDefaultView] = useState<"day" | "week">(
    "week",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setScheduleStartTime(settings.scheduleStartTime);
      setScheduleEndTime(settings.scheduleEndTime);
      setScheduleDefaultView(settings.scheduleDefaultView);
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
    <form onSubmit={save} className="space-y-6">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-700">Schedule hours</p>
          <p className="mt-1 text-xs text-slate-500">
            Only show these hours on the weekly schedule grid.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Start</span>
              <input
                type="time"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={scheduleStartTime}
                onChange={(e) => setScheduleStartTime(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">End</span>
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

        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700">Default view</p>
          <p className="mt-1 text-xs text-slate-500">
            Layout when you first open the Schedule tab.
          </p>
          <div className="mt-3">
            <SegmentedControl
              label="Default schedule view"
              value={scheduleDefaultView}
              onChange={setScheduleDefaultView}
              options={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
              ]}
            />
          </div>
        </div>
      </div>

      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      {saved && <InlineNotice tone="success">Schedule settings saved.</InlineNotice>}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
