"use client";

import { HolidaysSection } from "../../components/HolidaysSection";
import { SettingsPageLayout } from "../../components/settings/settings-ui";
import { useOnboardingBackLink } from "../../hooks/useOnboardingBackLink";

export default function HolidaysSettingsPage() {
  const back = useOnboardingBackLink();

  return (
    <SettingsPageLayout
      title="Time off 🏝️"
      description="Mark holidays and other periods when you cannot work. The schedule will show these as unavailable and template apply will skip conflicting slots."
      backHref={back.backHref}
      backLabel={back.backLabel}
    >
      <HolidaysSection embedded />
    </SettingsPageLayout>
  );
}
