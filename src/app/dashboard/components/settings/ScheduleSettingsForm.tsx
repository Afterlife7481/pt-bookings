"use client";

import { useEffect, useState } from "react";
import { Button, InlineNotice } from "@/components/ui";
import { TimeSelect5Min } from "@/components/TimeSelect5Min";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import { snapTimeToBookingStep } from "@/lib/constants";
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
      setScheduleStartTime(snapTimeToBookingStep(settings.scheduleStartTime));
      setScheduleEndTime(snapTimeToBookingStep(settings.scheduleEndTime));
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
          scheduleStartTime: snapTimeToBookingStep(scheduleStartTime),
          scheduleEndTime: snapTimeToBookingStep(scheduleEndTime),
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
            Only show these hours on the weekly schedule grid. Times use 5-minute
            steps.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Start</span>
              <TimeSelect5Min
                value={scheduleStartTime}
                onChange={setScheduleStartTime}
                aria-label="Schedule start"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">End</span>
              <TimeSelect5Min
                value={scheduleEndTime}
                onChange={setScheduleEndTime}
                aria-label="Schedule end"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700">Default view</p>
          <p className="mt-1 text-xs text-slate-500">
            Layout on phone and tablet when you open Schedule. Desktop always
            opens in week view.
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
