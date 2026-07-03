"use client";

import { useEffect, useState } from "react";
import { Button, InlineNotice } from "@/components/ui";
import { TRAINER_TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from "@/lib/constants";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import type { TrainerSettings } from "../../types";

export function AccountSettingsForm({
  settings,
  onSaved,
}: {
  settings: TrainerSettings | null;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setEmail(settings.email);
      setPhone(settings.phone);
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
        body: JSON.stringify({ email, phone, timezone }),
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
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Email</span>
          <span className="text-xs text-slate-500">Used to sign in with a magic link.</span>
          <input
            type="email"
            autoComplete="email"
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Phone</span>
          <span className="text-xs text-slate-500">For trainer notifications.</span>
          <input
            type="tel"
            autoComplete="tel"
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+44 7700 900000"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Time zone</span>
          <span className="text-xs text-slate-500">
            Used for WhatsApp timestamps and dashboard times.
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
      </div>

      {error && <InlineNotice tone="error">{error}</InlineNotice>}
      {saved && <InlineNotice tone="success">Account settings saved.</InlineNotice>}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
