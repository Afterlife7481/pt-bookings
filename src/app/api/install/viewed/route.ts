import { ensureDb } from "@/lib/db/init";
import { errorResponse } from "@/lib/http/errors";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { markInstallAppViewed } from "@/lib/services/onboarding";

/** Marks the optional home-screen install onboarding step complete. */
export async function POST() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  try {
    await markInstallAppViewed(trainerId);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Failed to record install page view");
  }
}
