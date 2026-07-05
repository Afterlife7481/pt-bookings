export const ONBOARDING_PATH_PREFIXES = [
  "/dashboard/onboarding",
  "/dashboard/settings/regional",
  "/dashboard/settings/locations",
  "/dashboard/settings/schedule",
  "/dashboard/settings/templates",
  "/dashboard/clients",
] as const;

export function isOnboardingAllowedPath(pathname: string): boolean {
  return ONBOARDING_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
