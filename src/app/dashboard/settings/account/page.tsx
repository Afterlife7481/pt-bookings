"use client";

import { AccountSettingsForm } from "../../components/settings/AccountSettingsForm";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";

export default function AccountSettingsPage() {
  const { settings, refresh } = useTrainerSettings();

  return (
    <SettingsPageLayout
      title="Account"
      description="Contact details and time zone for your dashboard."
    >
      <SettingsInset>
        <AccountSettingsForm settings={settings} onSaved={refresh} />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
