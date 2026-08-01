import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTrainerIdFromRequest } from "@/lib/auth/api";
import { ensureDb } from "@/lib/db/init";
import { isOnboardingAllowedPath } from "@/lib/onboarding-paths";
import { TRAINER_MANIFEST_PATH } from "@/lib/pwa-manifest";
import { getOnboardingStatus } from "@/lib/services/onboarding";
import { DashboardShell } from "./components/DashboardShell";

export const metadata: Metadata = {
  manifest: TRAINER_MANIFEST_PATH,
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (trainerId && pathname) {
    const status = await getOnboardingStatus(trainerId);

    if (!status.complete && !isOnboardingAllowedPath(pathname)) {
      redirect("/dashboard/onboarding");
    }

    if (status.allStepsComplete && pathname === "/dashboard/onboarding") {
      redirect("/dashboard/schedule");
    }
  }

  return <DashboardShell>{children}</DashboardShell>;
}
