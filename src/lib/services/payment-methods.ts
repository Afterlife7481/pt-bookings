import { nanoid } from "nanoid";
import { and, asc, eq, max } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { trainerPaymentMethods } from "@/lib/db/schema";
import { DEFAULT_PAYMENT_METHODS, nowIso } from "@/lib/constants";

export type PaymentMethodRow = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
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

export async function ensureDefaultPaymentMethods(trainerId: string) {
  const db = getDb();
  const existing = await db
    .select({ id: trainerPaymentMethods.id })
    .from(trainerPaymentMethods)
    .where(eq(trainerPaymentMethods.trainerId, trainerId))
    .limit(1);
  if (existing.length > 0) return;

  const createdAt = nowIso();
  await db.insert(trainerPaymentMethods).values(
    DEFAULT_PAYMENT_METHODS.map((name, sortOrder) => ({
      id: nanoid(),
      trainerId,
      name,
      sortOrder,
      createdAt,
    })),
  );
}

export async function createPaymentMethod(
  trainerId: string,
  params: { name: string },
): Promise<PaymentMethodRow> {
  const name = normalizeName(params.name);
  if (!name) throw new Error("Payment method name is required");
  if (name.length > 40) throw new Error("Payment method name is too long");

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
    sortOrder,
    createdAt,
  });

  return { id, name, sortOrder, createdAt };
}

export async function updatePaymentMethod(
  trainerId: string,
  methodId: string,
  params: { name?: string },
): Promise<PaymentMethodRow> {
  const method = await assertTrainerPaymentMethod(trainerId, methodId);
  if (params.name === undefined) {
    return {
      id: method.id,
      name: method.name,
      sortOrder: method.sortOrder,
      createdAt: method.createdAt,
    };
  }

  const name = normalizeName(params.name);
  if (!name) throw new Error("Payment method name is required");
  if (name.length > 40) throw new Error("Payment method name is too long");

  if (name !== method.name) {
    const duplicate = await getDb().query.trainerPaymentMethods.findFirst({
      where: and(
        eq(trainerPaymentMethods.trainerId, trainerId),
        eq(trainerPaymentMethods.name, name),
      ),
    });
    if (duplicate) throw new Error("That payment method already exists");
  }

  await getDb()
    .update(trainerPaymentMethods)
    .set({ name })
    .where(eq(trainerPaymentMethods.id, methodId));

  return {
    id: method.id,
    name,
    sortOrder: method.sortOrder,
    createdAt: method.createdAt,
  };
}

export async function deletePaymentMethod(
  trainerId: string,
  methodId: string,
): Promise<void> {
  await assertTrainerPaymentMethod(trainerId, methodId);
  const methods = await listPaymentMethods(trainerId);
  if (methods.length <= 1) {
    throw new Error("Keep at least one payment method");
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
