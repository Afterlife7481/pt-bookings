"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isOnboardingAllowedPath } from "@/lib/onboarding-paths";
import { useOnboarding } from "../hooks/useOnboarding";

function GateLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-slate-500">Loading…</p>
    </div>
  );
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, loading } = useOnboarding();

  const shouldOpenOnboarding =
    !!status && !status.complete && !isOnboardingAllowedPath(pathname);
  const shouldLeaveOnboarding =
    !!status && status.allStepsComplete && pathname === "/dashboard/onboarding";
  const redirecting = shouldOpenOnboarding || shouldLeaveOnboarding;

  useEffect(() => {
    if (loading || !status) return;

    if (shouldLeaveOnboarding) {
      router.replace("/dashboard/schedule");
      return;
    }

    if (shouldOpenOnboarding) {
      router.replace("/dashboard/onboarding");
    }
  }, [
    loading,
    router,
    shouldLeaveOnboarding,
    shouldOpenOnboarding,
    status,
  ]);

  if (loading || !status || redirecting) {
    return <GateLoading />;
  }

  return children;
}
