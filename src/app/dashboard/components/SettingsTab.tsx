"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, InlineNotice } from "@/components/ui";
import {
  TRAINER_TIMEZONE_OPTIONS,
  DEFAULT_TIMEZONE,
  MAX_CLIENT_BOOKING_WINDOW_WEEKS,
  MIN_CLIENT_BOOKING_WINDOW_WEEKS,
} from "@/lib/constants";
import { ApiError, fetchJson } from "@/lib/api/fetch-json";
import { LocationsSection } from "./LocationsSection";
import { InstallAppSection } from "./InstallAppSection";
import { PaymentDetailsSection } from "./PaymentDetailsSection";
import { logoutTrainer } from "../hooks/useTrainerSettings";
import type { TrainerSettings } from "../types";

function SettingsBlock({
  title,
  description,
  children,
  bordered = true,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  bordered?: boolean;
}) {
  return (
    <section className={bordered ? "border-t border-slate-100 pt-6" : undefined}>
      <h3 className="text-sm font-medium text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SettingsGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [scheduleDefaultView, setScheduleDefaultView] = useState<"day" | "week">(
    "week",
  );
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState("36");
  const [lastMinuteOfferLockHours, setLastMinuteOfferLockHours] = useState("1");
  const [bookingWindowPreset, setBookingWindowPreset] = useState<
    "1" | "2" | "3" | "custom"
  >("2");
  const [customBookingWindowWeeks, setCustomBookingWindowWeeks] = useState("4");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{
    id: string;
    email: string;
    dbHost?: string;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setAccountInfo)
      .catch(() => setAccountInfo(null));
  }, []);

  useEffect(() => {
    if (settings) {
      setEmail(settings.email);
      setPhone(settings.phone);
      setScheduleStartTime(settings.scheduleStartTime);
      setScheduleEndTime(settings.scheduleEndTime);
      setScheduleDefaultView(settings.scheduleDefaultView);
      setTimezone(settings.timezone);
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
          email,
          phone,
          scheduleStartTime,
          scheduleEndTime,
          scheduleDefaultView,
          timezone,
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
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-4 text-center">
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => logoutTrainer()}
          >
            Log out
          </Button>
        </div>
        <p>
          <Link
            href="/info#getting-started"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            New here? Read the getting-started guide →
          </Link>
        </p>
      </header>

      <InstallAppSection />

      <LocationsSection onChanged={onLocationsChanged} />

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Account, schedule display, and rules for client booking.
        </p>

        <form onSubmit={save} className="mt-8 space-y-10">
          <SettingsGroup label="Account">
            <SettingsBlock
              title="Contact details"
              description="Your email is used to sign in. Your phone can be used for trainer notifications."
              bordered={false}
            >
              <div className="flex max-w-md flex-col gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-600">Phone</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    className="rounded-lg border border-slate-300 px-3 py-2"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7700 900000"
                  />
                </label>
              </div>
            </SettingsBlock>

            <SettingsBlock
              title="Time zone"
              description="Used for WhatsApp message timestamps and other times shown in your dashboard."
            >
              <label className="flex max-w-md flex-col gap-1 text-sm">
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
            </SettingsBlock>
          </SettingsGroup>

          <SettingsGroup label="Schedule">
            <SettingsBlock
              title="Weekly template"
              description="Define your weekly slot pattern and apply it to the schedule. Set slot durations in the template editor."
              bordered={false}
            >
              <Link href="/dashboard/settings/templates">
                <Button type="button" variant="secondary">
                  Edit weekly template →
                </Button>
              </Link>
            </SettingsBlock>

            <SettingsBlock
              title="Schedule hours"
              description="Only show these hours on the weekly schedule. Times outside this range are hidden."
            >
              <div className="flex flex-wrap gap-4">
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
            </SettingsBlock>

            <SettingsBlock
              title="Default schedule view"
              description="Which layout to show first when you open the Schedule tab."
            >
              <SegmentedControl
                label="Default schedule view"
                value={scheduleDefaultView}
                onChange={setScheduleDefaultView}
                options={[
                  { value: "day", label: "Day" },
                  { value: "week", label: "Week" },
                ]}
              />
            </SettingsBlock>
          </SettingsGroup>

          <SettingsGroup label="Client booking rules">
            <SettingsBlock
              title="Client booking window"
              description="Which calendar weeks clients can book or change into. This week always counts as one — e.g. 2 weeks means this week and next week."
              bordered={false}
            >
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
            </SettingsBlock>

            <SettingsBlock
              title="Change & cancellation threshold"
              description="Clients cannot change or cancel within this many hours of the session start. Inside that window, they must contact you directly."
            >
              <label className="flex flex-col gap-1 text-sm">
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
            </SettingsBlock>

            <SettingsBlock
              title="Last-minute offers"
              description="When you send a last-minute offer, the slot is reserved for that client for this many hours before you can offer it to someone else."
            >
              <label className="flex flex-col gap-1 text-sm">
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
            </SettingsBlock>
          </SettingsGroup>

          {error && <InlineNotice tone="error">{error}</InlineNotice>}
          {saved && <InlineNotice tone="success">Settings saved.</InlineNotice>}

          <div className="border-t border-slate-100 pt-6">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      </Card>

      <PaymentDetailsSection settings={settings} onSaved={onSaved} />

      {accountInfo?.dbHost && (
        <p className="text-center text-xs text-slate-400">
          Signed in as {accountInfo.email} · account {accountInfo.id} · database{" "}
          {accountInfo.dbHost}
        </p>
      )}
    </div>
  );
}
