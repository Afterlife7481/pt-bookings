import { nanoid } from "nanoid";
import { eq, and, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  recurringPreferences,
  bookings,
  templateSlots,
  weeklyTemplates,
} from "@/lib/db/schema";
import { nowIso } from "@/lib/constants";

export type RecurringSlotRef = { dayOfWeek: number; startTime: string };

export type RecurringSlotOption = {
  dayOfWeek: number;
  startTime: string;
  available: boolean;
  heldBy: { clientId: string; clientName: string } | null;
  isCurrentClient: boolean;
};

async function slotExistsInTemplates(
  trainerId: string,
  slot: RecurringSlotRef,
): Promise<boolean> {
  const db = getDb();
  const templates = await db
    .select({ id: weeklyTemplates.id })
    .from(weeklyTemplates)
    .where(eq(weeklyTemplates.trainerId, trainerId));

  for (const template of templates) {
    const match = await db.query.templateSlots.findFirst({
      where: and(
        eq(templateSlots.templateId, template.id),
        eq(templateSlots.dayOfWeek, slot.dayOfWeek),
        eq(templateSlots.startTime, slot.startTime),
      ),
    });
    if (match) return true;
  }
  return false;
}

export async function getRecurringSlotOptions(
  trainerId: string,
  clientId: string,
): Promise<RecurringSlotOption[]> {
  const db = getDb();

  const templates = await db
    .select({ id: weeklyTemplates.id })
    .from(weeklyTemplates)
    .where(eq(weeklyTemplates.trainerId, trainerId));

  const slotMap = new Map<string, RecurringSlotRef>();

  for (const template of templates) {
    const tSlots = await db
      .select()
      .from(templateSlots)
      .where(eq(templateSlots.templateId, template.id));

    for (const s of tSlots) {
      const key = `${s.dayOfWeek}-${s.startTime}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, { dayOfWeek: s.dayOfWeek, startTime: s.startTime });
      }
    }
  }

  const prefs = await db
    .select({
      pref: recurringPreferences,
      client: clients,
    })
    .from(recurringPreferences)
    .innerJoin(clients, eq(recurringPreferences.clientId, clients.id))
    .where(eq(recurringPreferences.trainerId, trainerId));

  const clientPrefKeys = new Set(
    prefs
      .filter(({ pref }) => pref.clientId === clientId)
      .map(({ pref }) => `${pref.dayOfWeek}-${pref.startTime}`),
  );

  const prefByKey = new Map(
    prefs.map(({ pref, client }) => [
      `${pref.dayOfWeek}-${pref.startTime}`,
      { clientId: client.id, clientName: client.name },
    ]),
  );

  return [...slotMap.values()]
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    })
    .map((slot) => {
      const key = `${slot.dayOfWeek}-${slot.startTime}`;
      const heldBy = prefByKey.get(key) ?? null;
      return {
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        available: !heldBy || heldBy.clientId === clientId,
        heldBy,
        isCurrentClient: clientPrefKeys.has(key),
      };
    });
}

export async function listClients(trainerId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.trainerId, trainerId));

  return Promise.all(
    rows.map(async (c) => {
      const prefs = await db
        .select()
        .from(recurringPreferences)
        .where(eq(recurringPreferences.clientId, c.id));
      return {
        ...c,
        recurringPreferences: prefs.map((p) => ({
          dayOfWeek: p.dayOfWeek,
          startTime: p.startTime,
        })),
      };
    }),
  );
}

export async function createClient(params: {
  trainerId: string;
  name: string;
  phone: string;
  lastMinuteOptIn?: boolean;
}) {
  const db = getDb();
  const id = nanoid();
  const token = nanoid(12);
  const createdAt = nowIso();

  await db.insert(clients).values({
    id,
    token,
    trainerId: params.trainerId,
    name: params.name,
    phone: params.phone,
    lastMinuteOptIn: params.lastMinuteOptIn ?? false,
    createdAt,
  });

  return id;
}

export async function getClientByToken(token: string) {
  const db = getDb();
  return db.query.clients.findFirst({
    where: eq(clients.token, token),
  });
}

export async function updateClientLastMinuteOptIn(
  clientId: string,
  optIn: boolean,
) {
  const db = getDb();
  await db
    .update(clients)
    .set({ lastMinuteOptIn: optIn })
    .where(eq(clients.id, clientId));
}

export async function setRecurringPreferences(
  clientId: string,
  trainerId: string,
  slots: RecurringSlotRef[],
) {
  const db = getDb();

  const uniqueSlots = new Map<string, RecurringSlotRef>();
  for (const slot of slots) {
    uniqueSlots.set(`${slot.dayOfWeek}-${slot.startTime}`, slot);
  }
  const normalized = [...uniqueSlots.values()];

  for (const slot of normalized) {
    const conflict = await db.query.recurringPreferences.findFirst({
      where: and(
        eq(recurringPreferences.trainerId, trainerId),
        eq(recurringPreferences.dayOfWeek, slot.dayOfWeek),
        eq(recurringPreferences.startTime, slot.startTime),
        ne(recurringPreferences.clientId, clientId),
      ),
    });

    if (conflict) {
      const holder = await db.query.clients.findFirst({
        where: eq(clients.id, conflict.clientId),
      });
      throw new Error(
        `${slot.startTime} on day ${slot.dayOfWeek} is already assigned to ${holder?.name ?? "another client"}`,
      );
    }

    if (!(await slotExistsInTemplates(trainerId, slot))) {
      throw new Error(
        `${slot.startTime} (day ${slot.dayOfWeek}) is not in any weekly template.`,
      );
    }
  }

  await db
    .delete(recurringPreferences)
    .where(eq(recurringPreferences.clientId, clientId));

  if (normalized.length === 0) return;

  const ts = nowIso();
  await db.insert(recurringPreferences).values(
    normalized.map((slot) => ({
      id: nanoid(),
      trainerId,
      clientId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      createdAt: ts,
    })),
  );
}

/** @deprecated use setRecurringPreferences */
export async function setRecurringPreference(
  clientId: string,
  trainerId: string,
  recurring: RecurringSlotRef | null,
) {
  await setRecurringPreferences(
    clientId,
    trainerId,
    recurring ? [recurring] : [],
  );
}

export async function toggleBookingOverride36h(bookingId: string) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
  });
  if (!booking) throw new Error("Booking not found");

  await db
    .update(bookings)
    .set({
      override36h: !booking.override36h,
      updatedAt: nowIso(),
    })
    .where(eq(bookings.id, bookingId));
}
