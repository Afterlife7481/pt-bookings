"use client";

import { RegionalSettingsForm } from "../../components/settings/RegionalSettingsForm";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";
import { useOnboardingBackLink } from "../../hooks/useOnboardingBackLink";

export default function RegionalSettingsPage() {
  const { settings, refresh } = useTrainerSettings();
  const back = useOnboardingBackLink();

  return (
    <SettingsPageLayout
      title="Regional settings"
      description="Time zone for feed timestamps and times shown in your dashboard."
      backHref={back.backHref}
      backLabel={back.backLabel}
    >
      <SettingsInset>
        <RegionalSettingsForm settings={settings} onSaved={refresh} />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
