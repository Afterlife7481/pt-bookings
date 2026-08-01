"use client";

import { InstallAppSection } from "../../components/InstallAppSection";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";
import { useOnboardingBackLink } from "../../hooks/useOnboardingBackLink";

export function InstallSettingsClient() {
  const back = useOnboardingBackLink();

  return (
    <SettingsPageLayout
      title="Install on your phone"
      description="Add PT Bookings to your home screen for quick access to your schedule — like a native app, without the App Store."
      backHref={back.backHref}
      backLabel={back.backLabel}
    >
      <SettingsInset>
        <InstallAppSection embedded />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
