"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { logoutTrainer } from "../../hooks/useTrainerSettings";
import type { TrainerSettings } from "../../types";
import { SettingsGroup, SettingsRowLink } from "./settings-ui";

export function SettingsMenu({ settings }: { settings: TrainerSettings | null }) {
  const bookingWindowWeeks = settings?.clientBookingWindowWeeks;
  const bookingDetail =
    bookingWindowWeeks != null ? `${bookingWindowWeeks} wk window` : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <header className="space-y-4 pt-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
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

      <SettingsGroup footer="Add the app to your home screen and set up where you train.">
        <SettingsRowLink
          href="/dashboard/settings/install"
          title="Install on your phone"
        />
        <SettingsRowLink href="/dashboard/settings/locations" title="Locations" />
      </SettingsGroup>

      <SettingsGroup footer="Account details, schedule display, client rules, and payment info.">
        <SettingsRowLink
          href="/dashboard/settings/account"
          title="Account"
          detail={settings?.email}
        />
        <SettingsRowLink
          href="/dashboard/settings/schedule"
          title="Schedule"
          detail={settings?.scheduleDefaultView === "day" ? "Day view" : "Week view"}
        />
        <SettingsRowLink
          href="/dashboard/settings/booking-rules"
          title="Client booking rules"
          detail={bookingDetail}
        />
        <SettingsRowLink href="/dashboard/settings/payment" title="Payment details" />
      </SettingsGroup>
    </div>
  );
}
