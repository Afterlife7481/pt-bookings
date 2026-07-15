"use client";

import { DashboardHeader } from "./DashboardHeader";
import { OnboardingGate } from "./OnboardingGate";
import {
  TrainerSettingsProvider,
  useTrainerSettings,
} from "../hooks/useTrainerSettings";

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { settings } = useTrainerSettings();

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader settings={settings} />
      <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4 overflow-x-clip p-4 sm:p-6">
        <OnboardingGate>{children}</OnboardingGate>
      </main>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <TrainerSettingsProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </TrainerSettingsProvider>
  );
}
