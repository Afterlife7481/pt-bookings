"use client";

import { BookingRulesSettingsForm } from "../../components/settings/BookingRulesSettingsForm";
import { SettingsPageLayout } from "../../components/settings/settings-ui";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";

export default function BookingRulesSettingsPage() {
  const { settings, refresh } = useTrainerSettings();

  return (
    <SettingsPageLayout
      title="Client booking rules"
      description="How far ahead clients can book, when they can cancel, and last-minute offer timing."
    >
      <BookingRulesSettingsForm settings={settings} onSaved={refresh} />
    </SettingsPageLayout>
  );
}
