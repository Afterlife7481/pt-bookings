"use client";

import { SettingsTab } from "../components/SettingsTab";
import { useTrainerSettings } from "../hooks/useTrainerSettings";

export default function SettingsPage() {
  const { settings, refresh } = useTrainerSettings();

  return (
    <SettingsTab
      settings={settings}
      onSaved={refresh}
      onLocationsChanged={refresh}
    />
  );
}
