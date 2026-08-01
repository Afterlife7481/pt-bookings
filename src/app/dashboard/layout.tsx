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

/** Dashboard needs the session cookie + Postgres — never prerender at build time. */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trainerId = await getTrainerIdFromRequest();
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (trainerId && pathname) {
    await ensureDb();
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
