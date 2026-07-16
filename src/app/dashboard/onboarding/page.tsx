"use client";

import { OnboardingChecklist } from "../components/OnboardingChecklist";
import { useOnboarding } from "../hooks/useOnboarding";

export default function OnboardingPage() {
  const { status, loading } = useOnboarding();

  if (loading || !status) {
    return <p className="text-sm text-slate-500">Loading setup checklist…</p>;
  }

  return <OnboardingChecklist status={status} />;
}
