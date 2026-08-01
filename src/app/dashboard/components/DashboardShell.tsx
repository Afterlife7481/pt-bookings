"use client";

import { useLayoutEffect, useRef } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { OnboardingBanner } from "./OnboardingBanner";
import { OnboardingGate } from "./OnboardingGate";
import { OnboardingProvider } from "../hooks/useOnboarding";
import {
  TrainerSettingsProvider,
  useTrainerSettings,
} from "../hooks/useTrainerSettings";

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { settings } = useTrainerSettings();
  const chromeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = chromeRef.current;
    if (!el) return;

    const sync = () => {
      document.documentElement.style.setProperty(
        "--dashboard-chrome-height",
        `${el.getBoundingClientRect().height}px`,
      );
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--dashboard-chrome-height");
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div
        ref={chromeRef}
        className="sticky top-0 z-40 border-b border-slate-200 bg-white"
      >
        <DashboardHeader settings={settings} />
        <OnboardingBanner />
      </div>
      <main className="mx-auto w-full min-w-0 max-w-6xl space-y-4 overflow-x-clip p-4 sm:p-6">
        <OnboardingGate>{children}</OnboardingGate>
      </main>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <TrainerSettingsProvider>
      <OnboardingProvider>
        <DashboardShellInner>{children}</DashboardShellInner>
      </OnboardingProvider>
    </TrainerSettingsProvider>
  );
}
