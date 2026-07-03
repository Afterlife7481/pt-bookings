"use client";

import { useEffect, useState } from "react";
import { Button, InlineNotice } from "@/components/ui";
import { TRAINER_TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from "@/lib/constants";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import type { TrainerSettings } from "../../types";

export function RegionalSettingsForm({
  settings,
  onSaved,
}: {
  settings: TrainerSettings | null;
  onSaved: () => void;
}) {
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setTimezone(settings.timezone);
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
        body: JSON.stringify({ timezone }),
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
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Time zone</span>
        <span className="text-xs text-slate-500">
          Used for WhatsApp message timestamps and other times shown in your
          dashboard.
        </span>
        <select
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
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

      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      {saved && <InlineNotice tone="success">Regional settings saved.</InlineNotice>}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
