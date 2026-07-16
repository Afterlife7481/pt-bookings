import { createHash, randomInt, timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";
import { and, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trainerMagicLinks, trainerSessions } from "@/lib/db/schema";
import { addMinutes, nowIso, SESSION_COOKIE } from "@/lib/constants";
import { sendTrainerOtpEmail } from "@/lib/email";
import { shouldExposeMagicLinkForEmail } from "@/lib/auth/dev-mode";
import { getTrainerByEmail } from "./trainers";
import {
  assertInviteCodeAvailable,
  createTrainerWithInvite,
  ensureTrainerInviteCode,
  normalizeInviteCode,
} from "./invites";

const OTP_MINUTES = 15;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_DAYS = 30;

export { SESSION_COOKIE };

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function otpPepper(): string {
  return (
    process.env.AUTH_OTP_PEPPER?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "pt-bookings-otp-dev-pepper"
  );
}

export function hashTrainerOtp(code: string): string {
  return createHash("sha256")
    .update(`${otpPepper()}:${code.trim()}`)
    .digest("hex");
}

function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function otpCodesMatch(expectedHash: string, code: string): boolean {
  const actual = Buffer.from(hashTrainerOtp(code), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function requestTrainerOtp(params: {
  email: string;
  name?: string;
  purpose: "signup" | "login";
  inviteCode?: string;
}) {
  const email = normalizeEmail(params.email);

  let inviteCode: string | null = null;

  if (params.purpose === "signup") {
    if (!params.name?.trim()) {
      throw new Error("Name is required to sign up.");
    }
    const existing = await getTrainerByEmail(email);
    if (existing) {
      throw new Error("An account with this email already exists. Try logging in.");
    }
    const invite = await assertInviteCodeAvailable(params.inviteCode ?? "");
    inviteCode = invite.code;
  } else {
    const existing = await getTrainerByEmail(email);
    if (!existing) {
      throw new Error("No account found for this email. Sign up first.");
    }
  }

  const db = getDb();
  const ts = nowIso();
  const code = generateOtpCode();
  const challengeId = nanoid();

  // Invalidate any unused challenges for this email.
  await db
    .update(trainerMagicLinks)
    .set({ usedAt: ts })
    .where(
      and(eq(trainerMagicLinks.email, email), isNull(trainerMagicLinks.usedAt)),
    );

  await db.insert(trainerMagicLinks).values({
    id: nanoid(),
    email,
    name: params.purpose === "signup" ? params.name!.trim() : null,
    purpose: params.purpose,
    inviteCode,
    token: challengeId,
    codeHash: hashTrainerOtp(code),
    attemptCount: 0,
    expiresAt: addMinutes(ts, OTP_MINUTES),
    createdAt: ts,
  });

  const exposeCode = shouldExposeMagicLinkForEmail(email);
  let delivered = false;

  if (exposeCode) {
    console.log(`[Trainer OTP → ${email}] ${code}`);
  } else {
    delivered = await sendTrainerOtpEmail({
      to: email,
      code,
      purpose: params.purpose,
      expiresInMinutes: OTP_MINUTES,
    });
    if (!delivered) {
      console.log(`[Trainer OTP → ${email}] ${code}`);
    }
  }

  return {
    email,
    expiresInMinutes: OTP_MINUTES,
    delivered,
    exposeCode,
    /** Only returned when local/staging debug exposure is enabled. */
    devCode: exposeCode ? code : undefined,
  };
}

export async function verifyTrainerOtp(params: {
  email: string;
  code: string;
}): Promise<string> {
  const email = normalizeEmail(params.email);
  const code = params.code.trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error("Enter the 6-digit code from your email.");
  }

  const db = getDb();
  const now = nowIso();

  const challenge = await db.query.trainerMagicLinks.findFirst({
    where: and(
      eq(trainerMagicLinks.email, email),
      isNull(trainerMagicLinks.usedAt),
      isNotNull(trainerMagicLinks.codeHash),
      gt(trainerMagicLinks.expiresAt, now),
    ),
    orderBy: [desc(trainerMagicLinks.createdAt)],
  });

  if (!challenge?.codeHash) {
    throw new Error("That code is invalid or has expired. Request a new one.");
  }

  if (challenge.attemptCount >= OTP_MAX_ATTEMPTS) {
    await db
      .update(trainerMagicLinks)
      .set({ usedAt: now })
      .where(eq(trainerMagicLinks.id, challenge.id));
    throw new Error("Too many incorrect attempts. Request a new code.");
  }

  if (!otpCodesMatch(challenge.codeHash, code)) {
    const nextAttempts = challenge.attemptCount + 1;
    await db
      .update(trainerMagicLinks)
      .set({
        attemptCount: nextAttempts,
        ...(nextAttempts >= OTP_MAX_ATTEMPTS ? { usedAt: now } : {}),
      })
      .where(eq(trainerMagicLinks.id, challenge.id));
    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      throw new Error("Too many incorrect attempts. Request a new code.");
    }
    throw new Error("That code is incorrect. Try again.");
  }

  let trainerId: string;

  if (challenge.purpose === "signup") {
    const inviteCode = normalizeInviteCode(challenge.inviteCode ?? "");
    if (!inviteCode) {
      throw new Error("An invite code is required to sign up.");
    }
    trainerId = await createTrainerWithInvite({
      name: challenge.name ?? "Trainer",
      email: challenge.email,
      inviteCode,
    });
  } else {
    const trainer = await getTrainerByEmail(challenge.email);
    if (!trainer) {
      throw new Error("Trainer account not found.");
    }
    trainerId = trainer.id;
    await ensureTrainerInviteCode(trainerId);
  }

  await db
    .update(trainerMagicLinks)
    .set({ usedAt: now })
    .where(eq(trainerMagicLinks.id, challenge.id));

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
