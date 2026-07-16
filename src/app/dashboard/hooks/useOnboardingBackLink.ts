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

  const clientStep = status.steps.find((step) => step.id === "client");
  const inOnboardingFlow = !status.complete || !clientStep?.complete;

  if (inOnboardingFlow) {
    return { backHref: "/dashboard/onboarding", backLabel: "Onboarding" };
  }

  return fallback;
}
