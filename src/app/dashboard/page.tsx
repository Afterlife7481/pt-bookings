import { redirect } from "next/navigation";
import { getTrainerIdFromRequest } from "@/lib/auth/api";
import { ensureDb } from "@/lib/db/init";
import { getOnboardingStatus } from "@/lib/services/onboarding";

export default async function DashboardPage() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) {
    redirect("/login");
  }

  const status = await getOnboardingStatus(trainerId);
  if (!status.complete) {
    redirect("/dashboard/onboarding");
  }

  redirect("/dashboard/schedule");
}
