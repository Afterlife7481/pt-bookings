"use client";

import { RegionalSettingsForm } from "../../components/settings/RegionalSettingsForm";
import { SettingsPageLayout } from "../../components/settings/settings-ui";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";
import { useOnboardingBackLink } from "../../hooks/useOnboardingBackLink";

export default function RegionalSettingsPage() {
  const { settings, refresh } = useTrainerSettings();
  const back = useOnboardingBackLink();

  return (
    <SettingsPageLayout
      title="Regional settings"
      description="Time zone and currency for prices and times shown in your dashboard."
      backHref={back.backHref}
      backLabel={back.backLabel}
    >
      <RegionalSettingsForm settings={settings} onSaved={refresh} />
    </SettingsPageLayout>
  );
}
