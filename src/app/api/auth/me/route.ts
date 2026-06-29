import { ensureDb } from "@/lib/db/init";
import { shouldExposeMagicLinks } from "@/lib/auth/dev-mode";
import { getTrainerById } from "@/lib/services/trainers";
import { getTrainerIdFromRequest, unauthorizedResponse } from "@/lib/auth/api";

function dbHostFingerprint(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !shouldExposeMagicLinks()) return undefined;
  try {
    const normalized = url.replace(/^postgresql:/, "http:");
    return new URL(normalized).host;
  } catch {
    return undefined;
  }
}

export async function GET() {
  await ensureDb();
  const trainerId = await getTrainerIdFromRequest();
  if (!trainerId) return unauthorizedResponse();

  const trainer = await getTrainerById(trainerId);
  if (!trainer) return unauthorizedResponse();

  const dbHost = dbHostFingerprint();

  return Response.json({
    id: trainer.id,
    name: trainer.name,
    email: trainer.email,
    ...(dbHost ? { dbHost } : {}),
  });
}
