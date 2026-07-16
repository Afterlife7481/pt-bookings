"use client";

import { ScheduleSettingsForm } from "../../components/settings/ScheduleSettingsForm";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";
import { useOnboardingBackLink } from "../../hooks/useOnboardingBackLink";

export default function ScheduleSettingsPage() {
  const { settings, refresh } = useTrainerSettings();
  const back = useOnboardingBackLink();

  return (
    <SettingsPageLayout
      title="Schedule"
      description="Visible hours and default schedule view."
      backHref={back.backHref}
      backLabel={back.backLabel}
    >
      <SettingsInset>
        <ScheduleSettingsForm settings={settings} onSaved={refresh} />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
