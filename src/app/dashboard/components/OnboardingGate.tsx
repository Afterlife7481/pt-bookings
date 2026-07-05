"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isOnboardingAllowedPath } from "@/lib/onboarding-paths";
import { useOnboarding } from "../hooks/useOnboarding";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, loading } = useOnboarding();

  useEffect(() => {
    if (loading || !status) return;

    if (status.complete) {
      if (pathname === "/dashboard/onboarding") {
        router.replace("/dashboard/schedule");
      }
      return;
    }

    if (!isOnboardingAllowedPath(pathname)) {
      router.replace("/dashboard/onboarding");
    }
  }, [loading, pathname, router, status]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return children;
}
