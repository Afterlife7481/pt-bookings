import { getTrainerIdFromRequest } from "@/lib/auth/api";
import { ensureDb } from "@/lib/db/init";
import { markInstallAppViewed } from "@/lib/services/onboarding";
import { InstallSettingsClient } from "./InstallSettingsClient";

export default async function InstallSettingsPage() {
  const trainerId = await getTrainerIdFromRequest();
  if (trainerId) {
    await ensureDb();
    await markInstallAppViewed(trainerId);
  }

  return <InstallSettingsClient />;
}
