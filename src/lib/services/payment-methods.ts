import { nanoid } from "nanoid";
import { and, asc, eq, max } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trainerPaymentMethods } from "@/lib/db/schema";
import {
  DEFAULT_PAYMENT_METHODS,
  isProtectedPaymentMethod,
  nowIso,
} from "@/lib/constants";

export type PaymentMethodRow = {
  id: string;
  name: string;
  note: string | null;
  sortOrder: number;
  createdAt: string;
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function normalizeNote(note: string | null | undefined): string | null {
  if (note == null) return null;
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function listPaymentMethods(
  trainerId: string,
): Promise<PaymentMethodRow[]> {
  await ensureDefaultPaymentMethods(trainerId);
  const db = getDb();
  const rows = await db
    .select({
      id: trainerPaymentMethods.id,
      name: trainerPaymentMethods.name,
      note: trainerPaymentMethods.note,
      sortOrder: trainerPaymentMethods.sortOrder,
      createdAt: trainerPaymentMethods.createdAt,
    })
    .from(trainerPaymentMethods)
    .where(eq(trainerPaymentMethods.trainerId, trainerId))
    .orderBy(
      asc(trainerPaymentMethods.sortOrder),
      asc(trainerPaymentMethods.name),
    );
  return rows;
}

/** Ensure Cash and Transfer always exist for the trainer. */
export async function ensureDefaultPaymentMethods(trainerId: string) {
  const db = getDb();
  const existing = await db
    .select({
      id: trainerPaymentMethods.id,
      name: trainerPaymentMethods.name,
    })
    .from(trainerPaymentMethods)
    .where(eq(trainerPaymentMethods.trainerId, trainerId));

  const existingNames = new Set(
    existing.map((row) => row.name.trim().toLowerCase()),
  );
  const createdAt = nowIso();
  const missing = DEFAULT_PAYMENT_METHODS.filter(
    (name) => !existingNames.has(name.toLowerCase()),
  );
  if (missing.length === 0) return;

  const [{ nextSort }] = await db
    .select({ nextSort: max(trainerPaymentMethods.sortOrder) })
    .from(trainerPaymentMethods)
    .where(eq(trainerPaymentMethods.trainerId, trainerId));

  let sortOrder = nextSort == null ? 0 : nextSort + 1;
  await db.insert(trainerPaymentMethods).values(
    missing.map((name) => {
      const preferredOrder = DEFAULT_PAYMENT_METHODS.indexOf(name);
      const row = {
        id: nanoid(),
        trainerId,
        name,
        note: null as string | null,
        sortOrder:
          existing.length === 0 && preferredOrder >= 0
            ? preferredOrder
            : sortOrder++,
        createdAt,
      };
      return row;
    }),
  );
}

export async function createPaymentMethod(
  trainerId: string,
  params: { name: string; note?: string | null },
): Promise<PaymentMethodRow> {
  const name = normalizeName(params.name);
  if (!name) throw new Error("Payment method name is required");
  if (name.length > 40) throw new Error("Payment method name is too long");
  if (isProtectedPaymentMethod(name)) {
    throw new Error(`${name} is already included by default`);
  }

  const note = normalizeNote(params.note);
  if (note && note.length > 2000) {
    throw new Error("Payment method note is too long");
  }

  await ensureDefaultPaymentMethods(trainerId);
  const db = getDb();

  const duplicate = await db.query.trainerPaymentMethods.findFirst({
    where: and(
      eq(trainerPaymentMethods.trainerId, trainerId),
      eq(trainerPaymentMethods.name, name),
    ),
  });
  if (duplicate) throw new Error("That payment method already exists");

  const [{ nextSort }] = await db
    .select({ nextSort: max(trainerPaymentMethods.sortOrder) })
    .from(trainerPaymentMethods)
    .where(eq(trainerPaymentMethods.trainerId, trainerId));

  const id = nanoid();
  const createdAt = nowIso();
  const sortOrder = (nextSort ?? -1) + 1;

  await db.insert(trainerPaymentMethods).values({
    id,
    trainerId,
    name,
    note,
    sortOrder,
    createdAt,
  });

  return { id, name, note, sortOrder, createdAt };
}

export async function updatePaymentMethod(
  trainerId: string,
  methodId: string,
  params: { name?: string; note?: string | null },
): Promise<PaymentMethodRow> {
  const method = await assertTrainerPaymentMethod(trainerId, methodId);
  const protectedMethod = isProtectedPaymentMethod(method.name);

  let name = method.name;
  if (params.name !== undefined) {
    if (protectedMethod) {
      throw new Error(`${method.name} cannot be renamed`);
    }
    name = normalizeName(params.name);
    if (!name) throw new Error("Payment method name is required");
    if (name.length > 40) throw new Error("Payment method name is too long");
    if (isProtectedPaymentMethod(name)) {
      throw new Error(`${name} is already included by default`);
    }
    if (name !== method.name) {
      const duplicate = await getDb().query.trainerPaymentMethods.findFirst({
        where: and(
          eq(trainerPaymentMethods.trainerId, trainerId),
          eq(trainerPaymentMethods.name, name),
        ),
      });
      if (duplicate) throw new Error("That payment method already exists");
    }
  }

  let note = method.note ?? null;
  if (params.note !== undefined) {
    note = normalizeNote(params.note);
    if (note && note.length > 2000) {
      throw new Error("Payment method note is too long");
    }
  }

  if (name === method.name && note === (method.note ?? null)) {
    return {
      id: method.id,
      name: method.name,
      note: method.note ?? null,
      sortOrder: method.sortOrder,
      createdAt: method.createdAt,
    };
  }

  await getDb()
    .update(trainerPaymentMethods)
    .set({ name, note })
    .where(eq(trainerPaymentMethods.id, methodId));

  return {
    id: method.id,
    name,
    note,
    sortOrder: method.sortOrder,
    createdAt: method.createdAt,
  };
}

export async function deletePaymentMethod(
  trainerId: string,
  methodId: string,
): Promise<void> {
  const method = await assertTrainerPaymentMethod(trainerId, methodId);
  if (isProtectedPaymentMethod(method.name)) {
    throw new Error(`${method.name} cannot be removed`);
  }
  await getDb()
    .delete(trainerPaymentMethods)
    .where(eq(trainerPaymentMethods.id, methodId));
}

export async function assertTrainerPaymentMethod(
  trainerId: string,
  methodId: string,
) {
  const db = getDb();
  const method = await db.query.trainerPaymentMethods.findFirst({
    where: and(
      eq(trainerPaymentMethods.id, methodId),
      eq(trainerPaymentMethods.trainerId, trainerId),
    ),
  });
  if (!method) throw new Error("Payment method not found");
  return method;
}

export async function assertTrainerPaymentMethodName(
  trainerId: string,
  name: string,
): Promise<string> {
  const methods = await listPaymentMethods(trainerId);
  const match = methods.find(
    (method) => method.name.toLowerCase() === name.toLowerCase(),
  );
  if (!match) {
    throw new Error("Select a valid payment method");
  }
  return match.name;
}
