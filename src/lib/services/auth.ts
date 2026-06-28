import { nanoid } from "nanoid";
import { eq, and, gt, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trainerMagicLinks, trainerSessions } from "@/lib/db/schema";
import { addMinutes, appBaseUrl, nowIso, SESSION_COOKIE } from "@/lib/constants";
import { createTrainer, getTrainerByEmail } from "./trainers";

const MAGIC_LINK_MINUTES = 15;
const SESSION_DAYS = 30;

export { SESSION_COOKIE };

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

export async function requestMagicLink(params: {
  email: string;
  name?: string;
  purpose: "signup" | "login";
}) {
  const email = normalizeEmail(params.email);

  if (params.purpose === "signup") {
    if (!params.name?.trim()) {
      throw new Error("Name is required to sign up.");
    }
    const existing = await getTrainerByEmail(email);
    if (existing) {
      throw new Error("An account with this email already exists. Try logging in.");
    }
  } else {
    const existing = await getTrainerByEmail(email);
    if (!existing) {
      throw new Error("No account found for this email. Sign up first.");
    }
  }

  const db = getDb();
  const token = nanoid(32);
  const ts = nowIso();

  await db.insert(trainerMagicLinks).values({
    id: nanoid(),
    email,
    name: params.purpose === "signup" ? params.name!.trim() : null,
    purpose: params.purpose,
    token,
    expiresAt: addMinutes(ts, MAGIC_LINK_MINUTES),
    createdAt: ts,
  });

  const url = `${appBaseUrl()}/auth/verify?token=${token}`;
  console.log(`[Magic link → ${email}] ${url}`);

  return { email, url, expiresInMinutes: MAGIC_LINK_MINUTES };
}

export async function verifyMagicLink(token: string): Promise<string> {
  const db = getDb();
  const now = nowIso();

  const link = await db.query.trainerMagicLinks.findFirst({
    where: and(
      eq(trainerMagicLinks.token, token),
      isNull(trainerMagicLinks.usedAt),
      gt(trainerMagicLinks.expiresAt, now),
    ),
  });

  if (!link) {
    throw new Error("This sign-in link is invalid or has expired.");
  }

  let trainerId: string;

  if (link.purpose === "signup") {
    trainerId = await createTrainer(link.name ?? "Trainer", link.email);
  } else {
    const trainer = await getTrainerByEmail(link.email);
    if (!trainer) {
      throw new Error("Trainer account not found.");
    }
    trainerId = trainer.id;
  }

  await db
    .update(trainerMagicLinks)
    .set({ usedAt: now })
    .where(eq(trainerMagicLinks.id, link.id));

  return trainerId;
}

export async function createTrainerSession(trainerId: string) {
  const db = getDb();
  const ts = nowIso();
  const token = nanoid(32);
  const expiresAt = addMinutes(ts, SESSION_DAYS * 24 * 60);

  await db.insert(trainerSessions).values({
    id: nanoid(),
    trainerId,
    token,
    expiresAt,
    createdAt: ts,
  });

  return { token, expiresAt };
}

export async function getTrainerIdFromSessionToken(
  sessionToken: string | undefined,
): Promise<string | null> {
  if (!sessionToken) return null;

  const db = getDb();
  const now = nowIso();
  const session = await db.query.trainerSessions.findFirst({
    where: and(
      eq(trainerSessions.token, sessionToken),
      gt(trainerSessions.expiresAt, now),
    ),
  });

  return session?.trainerId ?? null;
}

export async function deleteTrainerSession(sessionToken: string) {
  const db = getDb();
  await db
    .delete(trainerSessions)
    .where(eq(trainerSessions.token, sessionToken));
}
