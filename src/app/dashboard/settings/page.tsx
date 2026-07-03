"use client";

import { SettingsMenu } from "../components/settings/SettingsMenu";
import { useTrainerSettings } from "../hooks/useTrainerSettings";

export default function SettingsPage() {
  const { settings } = useTrainerSettings();

  return <SettingsMenu settings={settings} />;
}
