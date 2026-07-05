import { ensureDb } from "@/lib/db/init";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";
import { getOnboardingStatus } from "@/lib/services/onboarding";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const status = await getOnboardingStatus(trainerId);
  return Response.json(status);
}
