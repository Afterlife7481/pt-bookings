import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trainers } from "@/lib/db/schema";
import { nowIso } from "@/lib/constants";

export async function getTrainerByEmail(email: string) {
  const db = getDb();
  return db.query.trainers.findFirst({
    where: eq(trainers.email, email.toLowerCase().trim()),
  });
}

export async function getTrainerById(trainerId: string) {
  const db = getDb();
  return db.query.trainers.findFirst({
    where: eq(trainers.id, trainerId),
  });
}

export async function createTrainer(name: string, email: string) {
  const db = getDb();
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await getTrainerByEmail(normalizedEmail);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const id = nanoid();
  await db.insert(trainers).values({
    id,
    name: name.trim(),
    email: normalizedEmail,
    createdAt: nowIso(),
  });
  return id;
}
