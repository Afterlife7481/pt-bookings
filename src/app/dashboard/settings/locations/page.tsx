"use client";

import { LocationsSection } from "../../components/LocationsSection";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";
import { useOnboardingBackLink } from "../../hooks/useOnboardingBackLink";

export default function LocationsSettingsPage() {
  const back = useOnboardingBackLink();

  return (
    <SettingsPageLayout
      title="Locations"
      description="Places where you train. Enable locations for each client from their profile."
      backHref={back.backHref}
      backLabel={back.backLabel}
    >
      <SettingsInset>
        <LocationsSection embedded />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
