"use client";

import { TRAINER_TIMEZONE_OPTIONS } from "@/lib/constants";
import type { TrainerSettings } from "../../types";
import {
  SettingsGroup,
  SettingsRowLink,
} from "./settings-ui";

function timezoneMenuDetail(timezone: string | undefined): string | undefined {
  if (!timezone) return undefined;
  const match = TRAINER_TIMEZONE_OPTIONS.find((opt) => opt.value === timezone);
  if (!match) return timezone;
  const city = match.label.match(/\(([^)]+)\)/)?.[1];
  return city ?? match.label;
}

function regionalMenuDetail(settings: TrainerSettings | null): string | undefined {
  const tz = timezoneMenuDetail(settings?.timezone);
  const currency = settings?.currency;
  if (tz && currency) return `${tz} · ${currency}`;
  return tz ?? currency;
}

export function SettingsMenu({ settings }: { settings: TrainerSettings | null }) {
  const bookingWindowWeeks = settings?.clientBookingWindowWeeks;
  const bookingDetail =
    bookingWindowWeeks != null ? `${bookingWindowWeeks} wk window` : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
      </header>

      <SettingsGroup>
        <SettingsRowLink
          href="/dashboard/settings/locations"
          title="Your locations"
        />
        <SettingsRowLink
          href="/dashboard/settings/templates"
          title="Weekly template"
        />
        <SettingsRowLink
          href="/dashboard/settings/holidays"
          title="Time off"
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRowLink
          href="/dashboard/settings/schedule"
          title="Schedule"
          detail={settings?.scheduleDefaultView === "day" ? "Day view" : "Week view"}
        />
        <SettingsRowLink
          href="/dashboard/settings/booking-rules"
          title="Booking rules"
          detail={bookingDetail}
        />
        <SettingsRowLink
          href="/dashboard/settings/message-templates"
          title="Message templates"
        />
        <SettingsRowLink
          href="/dashboard/settings/regional"
          title="Regional settings"
          detail={regionalMenuDetail(settings)}
        />
        <SettingsRowLink href="/dashboard/settings/payment" title="Payment details" />
      </SettingsGroup>
    </div>
  );
}
