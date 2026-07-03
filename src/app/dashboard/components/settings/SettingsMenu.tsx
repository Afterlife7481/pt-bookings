"use client";

import { logoutTrainer } from "../../hooks/useTrainerSettings";
import type { TrainerSettings } from "../../types";
import {
  SettingsGroup,
  SettingsRowButton,
  SettingsRowLink,
} from "./settings-ui";

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
          href="/info#getting-started"
          title="Getting started guide"
        />
        <SettingsRowLink
          href="/dashboard/settings/install"
          title="Install on your phone"
          subtitle="Add the app to your home screen"
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRowLink
          href="/dashboard/settings/locations"
          title="Your locations"
        />
        <SettingsRowLink
          href="/dashboard/settings/templates"
          title="Weekly template"
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
        <SettingsRowLink href="/dashboard/settings/payment" title="Payment details" />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRowLink
          href="/dashboard/settings/account"
          title="Account"
          detail={settings?.email}
        />
        <SettingsRowButton
          title="Log out"
          onClick={() => logoutTrainer()}
          tone="danger"
        />
      </SettingsGroup>
    </div>
  );
}
