import { ensureDb } from "@/lib/db/init";
import { getTrainerById } from "@/lib/services/trainers";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const trainer = await getTrainerById(trainerId);
  if (!trainer) return unauthorizedResponse();

  return Response.json({
    id: trainer.id,
    name: trainer.name,
    email: trainer.email,
  });
}
