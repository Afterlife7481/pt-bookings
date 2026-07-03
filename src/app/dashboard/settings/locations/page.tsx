"use client";

import { LocationsSection } from "../../components/LocationsSection";
import {
  SettingsInset,
  SettingsPageLayout,
} from "../../components/settings/settings-ui";
import { useTrainerSettings } from "../../hooks/useTrainerSettings";

export default function LocationsSettingsPage() {
  const { refresh } = useTrainerSettings();

  return (
    <SettingsPageLayout
      title="Locations"
      description="Places where you train. Enable locations for each client from their profile."
    >
      <SettingsInset>
        <LocationsSection embedded onChanged={refresh} />
      </SettingsInset>
    </SettingsPageLayout>
  );
}
