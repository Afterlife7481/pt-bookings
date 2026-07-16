"use client";

import { InstallAppSection } from "../../components/InstallAppSection";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";

export default function InstallSettingsPage() {
  return (
    <SettingsPageLayout
      title="Install on your phone"
      description="Add PT Bookings to your home screen for quick access to your schedule — like a native app, without the App Store."
      showBackLink={false}
    >
      <SettingsInset>
        <InstallAppSection embedded />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
