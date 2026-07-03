"use client";

import { RegionalSettingsForm } from "../../components/settings/RegionalSettingsForm";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";

export default function RegionalSettingsPage() {
  const { settings, refresh } = useTrainerSettings();

  return (
    <SettingsPageLayout
      title="Regional settings"
      description="Time zone for WhatsApp timestamps and times shown in your dashboard."
    >
      <SettingsInset>
        <RegionalSettingsForm settings={settings} onSaved={refresh} />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
