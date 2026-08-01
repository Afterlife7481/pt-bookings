"use client";

import { useEffect } from "react";
import { InstallAppSection } from "../../components/InstallAppSection";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";
import { useOptionalOnboarding } from "../../hooks/useOnboarding";
import { useOnboardingBackLink } from "../../hooks/useOnboardingBackLink";

export default function InstallSettingsPage() {
  const back = useOnboardingBackLink();
  const refreshOnboarding = useOptionalOnboarding()?.refresh;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/install/viewed", { method: "POST" });
        if (!cancelled && res.ok) {
          await refreshOnboarding?.();
        }
      } catch {
        // Optional onboarding step — ignore network failures.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshOnboarding]);

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
