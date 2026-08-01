import { redirect } from "next/navigation";
import { getTrainerIdFromRequest } from "@/lib/auth/api";
import { ensureDb } from "@/lib/db/init";
import { getOnboardingStatus } from "@/lib/services/onboarding";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) {
    redirect("/login");
  }

  let needsOnboarding = false;
  try {
    await ensureDb();
    const status = await getOnboardingStatus(trainerId);
    needsOnboarding = !status.complete;
  } catch {
    // Prefer schedule over a white-screen; client OnboardingGate still enforces setup.
  }

  if (needsOnboarding) {
    redirect("/dashboard/onboarding");
  }

  redirect("/dashboard/schedule");
}
