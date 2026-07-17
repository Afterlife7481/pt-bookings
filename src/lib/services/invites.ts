import { customAlphabet, nanoid } from "nanoid";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { inviteCodes, inviteRedemptions, trainers } from "@/lib/db/schema";
import { nowIso } from "@/lib/constants";
import { ensureDefaultPaymentMethods } from "@/lib/services/payment-methods";

/** Default signup slots per invite code (raised later as the app matures). */
export const DEFAULT_INVITE_MAX_USES = 3;

const generateCodeBody = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatInviteCode(code: string): string {
  const normalized = normalizeInviteCode(code);
  if (normalized.length === 8) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
  }
  return normalized;
}

function newInviteCodeValue(): string {
  return generateCodeBody();
}

function assertCodeHasCapacity(code: {
  status: string;
  maxUses: number | null;
  usedCount: number;
}) {
  if (code.status !== "active") {
    throw new Error("This invite code is no longer active.");
  }
  if (code.maxUses != null && code.usedCount >= code.maxUses) {
    throw new Error("This invite code has reached its signup limit.");
  }
}

export async function getInviteCodeByValue(rawCode: string) {
  const code = normalizeInviteCode(rawCode);
  if (!code) return null;
  const db = getDb();
  return db.query.inviteCodes.findFirst({
    where: eq(inviteCodes.code, code),
  });
}

/** Validate without consuming — used when requesting a signup magic link. */
export async function assertInviteCodeAvailable(rawCode: string) {
  const code = normalizeInviteCode(rawCode);
  if (!code) {
    throw new Error("An invite code is required to sign up.");
  }
  const row = await getInviteCodeByValue(code);
  if (!row) {
    throw new Error("That invite code is invalid.");
  }
  assertCodeHasCapacity(row);
  return row;
}

async function insertUniqueInviteCode(params: {
  ownerTrainerId: string | null;
  maxUses: number | null;
}): Promise<string> {
  const db = getDb();
  const ts = nowIso();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = newInviteCodeValue();
    try {
      await db.insert(inviteCodes).values({
        id: nanoid(),
        code,
        ownerTrainerId: params.ownerTrainerId,
        maxUses: params.maxUses,
        usedCount: 0,
        status: "active",
        createdAt: ts,
      });
      return code;
    } catch {
      // Unique collision — try another code.
    }
  }

  throw new Error("Failed to generate a unique invite code");
}

/** Issue the trainer's single permanent invite code (idempotent). */
export async function ensureTrainerInviteCode(trainerId: string): Promise<string> {
  const db = getDb();
  const existing = await db.query.inviteCodes.findFirst({
    where: eq(inviteCodes.ownerTrainerId, trainerId),
  });
  if (existing) return existing.code;

  return insertUniqueInviteCode({
    ownerTrainerId: trainerId,
    maxUses: DEFAULT_INVITE_MAX_USES,
  });
}

/**
 * Create a trainer account and consume the invite code in one transaction.
 * Also issues the new trainer's permanent invite code.
 */
export async function createTrainerWithInvite(params: {
  name: string;
  email: string;
  inviteCode: string;
}): Promise<string> {
  const code = normalizeInviteCode(params.inviteCode);
  if (!code) {
    throw new Error("An invite code is required to sign up.");
  }

  const email = params.email.toLowerCase().trim();
  const name = params.name.trim() || "Trainer";
  const db = getDb();
  const ts = nowIso();

  const trainerId = await db.transaction(async (tx) => {
    const existing = await tx.query.trainers.findFirst({
      where: eq(trainers.email, email),
    });
    if (existing) {
      throw new Error("An account with this email already exists.");
    }

    const row = await tx.query.inviteCodes.findFirst({
      where: eq(inviteCodes.code, code),
    });
    if (!row) {
      throw new Error("That invite code is invalid.");
    }
    assertCodeHasCapacity(row);

    const capacityClause =
      row.maxUses == null
        ? sql`true`
        : sql`${inviteCodes.usedCount} < ${inviteCodes.maxUses}`;

    const updated = await tx
      .update(inviteCodes)
      .set({ usedCount: sql`${inviteCodes.usedCount} + 1` })
      .where(
        and(
          eq(inviteCodes.id, row.id),
          eq(inviteCodes.status, "active"),
          capacityClause,
        ),
      )
      .returning({ id: inviteCodes.id });

    if (updated.length === 0) {
      throw new Error("This invite code has reached its signup limit.");
    }

    const id = nanoid();
    await tx.insert(trainers).values({
      id,
      name,
      email,
      createdAt: ts,
    });

    await tx.insert(inviteRedemptions).values({
      id: nanoid(),
      inviteCodeId: row.id,
      trainerId: id,
      createdAt: ts,
    });

    let issued = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        await tx.insert(inviteCodes).values({
          id: nanoid(),
          code: newInviteCodeValue(),
          ownerTrainerId: id,
          maxUses: DEFAULT_INVITE_MAX_USES,
          usedCount: 0,
          status: "active",
          createdAt: ts,
        });
        issued = true;
        break;
      } catch {
        // Unique collision — retry.
      }
    }
    if (!issued) {
      throw new Error("Failed to generate a unique invite code");
    }

    return id;
  });

  await ensureDefaultPaymentMethods(trainerId);
  return trainerId;
}

/** Admin/ops: create seed invite codes with no trainer owner. */
export async function createSeedInviteCodes(params: {
  count: number;
  maxUses?: number | null;
}): Promise<string[]> {
  const count = Math.floor(params.count);
  if (!Number.isFinite(count) || count < 1 || count > 100) {
    throw new Error("Count must be between 1 and 100");
  }
  const maxUses =
    params.maxUses === undefined ? DEFAULT_INVITE_MAX_USES : params.maxUses;

  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    codes.push(
      await insertUniqueInviteCode({
        ownerTrainerId: null,
        maxUses,
      }),
    );
  }
  return codes;
}

export type TrainerInvitationsView = {
  code: string;
  displayCode: string;
  maxUses: number | null;
  usedCount: number;
  remainingUses: number | null;
  signups: {
    trainerId: string;
    name: string;
    createdAt: string;
  }[];
};

export async function getTrainerInvitations(
  trainerId: string,
): Promise<TrainerInvitationsView> {
  const codeValue = await ensureTrainerInviteCode(trainerId);
  const db = getDb();

  const trainer = await db.query.trainers.findFirst({
    where: eq(trainers.id, trainerId),
    columns: { invitationsViewedAt: true },
  });
  if (trainer && !trainer.invitationsViewedAt) {
    await db
      .update(trainers)
      .set({ invitationsViewedAt: nowIso() })
      .where(eq(trainers.id, trainerId));
  }

  const code = await db.query.inviteCodes.findFirst({
    where: eq(inviteCodes.code, codeValue),
  });
  if (!code) {
    throw new Error("Invite code not found");
  }

  const rows = await db
    .select({
      trainerId: trainers.id,
      name: trainers.name,
      createdAt: inviteRedemptions.createdAt,
    })
    .from(inviteRedemptions)
    .innerJoin(trainers, eq(inviteRedemptions.trainerId, trainers.id))
    .where(eq(inviteRedemptions.inviteCodeId, code.id))
    .orderBy(asc(inviteRedemptions.createdAt));

  const remainingUses =
    code.maxUses == null ? null : Math.max(0, code.maxUses - code.usedCount);

  return {
    code: code.code,
    displayCode: formatInviteCode(code.code),
    maxUses: code.maxUses,
    usedCount: code.usedCount,
    remainingUses,
    signups: rows.map((row) => ({
      trainerId: row.trainerId,
      name: row.name,
      createdAt: row.createdAt,
    })),
  };
}
