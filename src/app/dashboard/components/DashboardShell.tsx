"use client";

import { DashboardHeader } from "./DashboardHeader";
import { useTrainerSettings } from "../hooks/useTrainerSettings";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { settings } = useTrainerSettings();

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader settings={settings} />
      <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">{children}</main>
    </div>
  );
}
