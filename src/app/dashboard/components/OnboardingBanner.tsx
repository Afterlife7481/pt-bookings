"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnboarding } from "../hooks/useOnboarding";

export function OnboardingBanner() {
  const pathname = usePathname();
  const { status, loading } = useOnboarding();

  // Only nudge after required setup is done; optional leftovers can wait.
  if (loading || !status || !status.complete || status.allStepsComplete) {
    return null;
  }
  if (pathname === "/dashboard/onboarding") return null;

  const optionalLeft = status.steps.filter(
    (step) => step.optional && !step.complete,
  ).length;
  const summary =
    optionalLeft === 1
      ? "1 optional step left"
      : `${optionalLeft} optional steps left`;

  return (
    <Link
      href="/dashboard/onboarding"
      className="block border-b border-sky-200 bg-sky-50 px-4 py-2.5 text-sky-950 transition hover:bg-sky-100 sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <p className="min-w-0 text-sm leading-snug">
          <span className="font-semibold">Finish optional setup</span>
          <span className="text-sky-800"> · {summary}</span>
        </p>
        <span className="shrink-0 text-sm font-medium text-sky-900">
          Open →
        </span>
      </div>
    </Link>
  );
}
