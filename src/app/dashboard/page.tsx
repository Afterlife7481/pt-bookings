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

  await ensureDb();
  const status = await getOnboardingStatus(trainerId);
  if (!status.complete) {
    redirect("/dashboard/onboarding");
  }

  redirect("/dashboard/schedule");
}
