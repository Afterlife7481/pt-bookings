import { useOnboarding } from "./useOnboarding";

type BackLink = { backHref: string; backLabel: string };

export function useOnboardingBackLink(fallback: BackLink = {
  backHref: "/dashboard/settings",
  backLabel: "Settings",
}): BackLink {
  const { status, loading } = useOnboarding();

  if (loading || !status) {
    return fallback;
  }

  const optionalIncomplete = status.steps.some(
    (step) => step.optional && !step.complete,
  );
  const inOnboardingFlow = !status.complete || optionalIncomplete;

  if (inOnboardingFlow) {
    return { backHref: "/dashboard/onboarding", backLabel: "Onboarding" };
  }

  return fallback;
}
