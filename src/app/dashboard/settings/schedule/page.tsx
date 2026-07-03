"use client";

import { ScheduleSettingsForm } from "../../components/settings/ScheduleSettingsForm";
import { SettingsPageLayout } from "../../components/settings/settings-ui";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";

export default function ScheduleSettingsPage() {
  const { settings, refresh } = useTrainerSettings();

  return (
    <SettingsPageLayout
      title="Schedule"
      description="Weekly template, visible hours, and default schedule view."
    >
      <ScheduleSettingsForm settings={settings} onSaved={refresh} />
    </SettingsPageLayout>
  );
}
