"use client";

import { AccountSettingsForm } from "../../components/settings/AccountSettingsForm";
import { DeleteAccountSection } from "../../components/settings/DeleteAccountSection";
import { SettingsPageLayout } from "../../components/settings/settings-ui";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";

export default function AccountSettingsPage() {
  const { settings, refresh } = useTrainerSettings();

  return (
    <SettingsPageLayout
      title="Account"
      description="Email and phone for sign-in and notifications."
      showBackLink={false}
    >
      <AccountSettingsForm settings={settings} onSaved={refresh} />
      <DeleteAccountSection settings={settings} />
    </SettingsPageLayout>
  );
}
