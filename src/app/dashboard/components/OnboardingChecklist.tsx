"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { OnboardingStatus } from "@/lib/services/onboarding";

function StepIcon({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-sm font-semibold text-slate-400">
      ·
    </span>
  );
}

export function OnboardingChecklist({ status }: { status: OnboardingStatus }) {
  const router = useRouter();
  const requiredSteps = status.steps.filter((step) => !step.optional);
  const completedRequired = requiredSteps.filter((step) => step.complete).length;
  const optionalIncomplete = status.steps.some(
    (step) => step.optional && !step.complete,
  );

  function stepCta(stepId: OnboardingStatus["steps"][number]["id"]) {
    if (stepId === "client") return "Add client";
    if (stepId === "install") return "Add to home screen";
    if (stepId === "invite") return "View invite code";
    return "Complete this step";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Set up PT Bookings
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          {status.complete
            ? "Required setup is done. Finish the optional steps below or open your schedule whenever you are ready."
            : "Complete these steps before using your schedule. The app needs your time zone, locations, diary hours, and weekly template to work properly."}
        </p>
        <p className="text-sm font-medium text-slate-700">
          {completedRequired} of {requiredSteps.length} required steps complete
        </p>
      </header>

      <Card className="overflow-hidden p-0">
        <ol className="divide-y divide-slate-100">
          {status.steps.map((step) => (
            <li key={step.id} className="flex items-start gap-4 px-4 py-4 sm:px-5">
              <StepIcon complete={step.complete} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "font-medium",
                      step.complete ? "text-slate-700" : "text-slate-900",
                    )}
                  >
                    {step.label}
                  </p>
                  {step.optional ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Optional
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {step.description}
                </p>
                {!step.complete ? (
                  <Link
                    href={step.href}
                    className="mt-3 inline-flex text-sm font-medium text-blue-600 hover:underline"
                  >
                    {stepCta(step.id)} →
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {status.complete ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => router.push("/dashboard/schedule")}>
            Open schedule
          </Button>
          {optionalIncomplete ? (
            <p className="w-full text-sm text-slate-500">
              Adding clients, installing the app, and inviting other trainers
              are optional — you can finish them later from the menu.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Finish all required steps above to unlock your schedule, sessions, and
          client tools.
        </p>
      )}
    </div>
  );
}
