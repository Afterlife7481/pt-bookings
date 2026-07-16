import { getDb } from "@/lib/db";
import { trainers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { TrainerContactKind } from "@/lib/contact";
import { sendTrainerContactEmail } from "@/lib/email";

const MAX_MESSAGE_LENGTH = 4000;

export async function submitTrainerContact(params: {
  trainerId: string;
  kind: TrainerContactKind;
  message: string;
}) {
  const message = params.message.trim();
  if (!message) {
    throw new Error("Please enter a message.");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
  }

  const db = getDb();
  const trainer = await db.query.trainers.findFirst({
    where: eq(trainers.id, params.trainerId),
  });
  if (!trainer) {
    throw new Error("Trainer not found");
  }

  await sendTrainerContactEmail({
    kind: params.kind,
    message,
    trainerName: trainer.name,
    trainerEmail: trainer.email,
  });
}
