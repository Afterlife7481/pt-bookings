import { nanoid } from "nanoid";
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  clientLastMinutePreferences,
} from "@/lib/db/schema";
import {
  nowIso,
  isScheduleTimeAligned,
} from "@/lib/constants";
import { hasClientEmail } from "@/lib/notify-channels";
import { getTrainerTemplateOverlay } from "./templates";
import { dayOfWeekLabel } from "@/lib/schedule-grid";
import {
  templateSlotKey,
  type LastMinuteSlotRef,
} from "./last-minute-shared";

/**
 * Deletes last-minute preferences that no longer match any template slot
 * (day + start time). Clients left with no prefs are opted out.
 */
export type PrunedLastMinuteClient = {
  clientId: string;
  clientName: string;
  email: string;
  token: string;
  pruneNotify: boolean;
  removed: LastMinuteSlotRef[];
  remainingCount: number;
  optedOut: boolean;
};

export async function pruneLastMinutePreferencesToTemplateSlots(
  trainerId: string,
  templateSlots: Array<{ dayOfWeek: number; startTime: string }>,
): Promise<{ deleted: number; prunedClients: PrunedLastMinuteClient[] }> {
  const db = getDb();
  const allowed = new Set(
    templateSlots.map((slot) => templateSlotKey(slot.dayOfWeek, slot.startTime)),
  );

  const prefs = await db
    .select({
      id: clientLastMinutePreferences.id,
      clientId: clientLastMinutePreferences.clientId,
      dayOfWeek: clientLastMinutePreferences.dayOfWeek,
      startTime: clientLastMinutePreferences.startTime,
      clientName: clients.name,
      email: clients.email,
      token: clients.token,
      pruneNotify: clients.lastMinutePruneNotify,
    })
    .from(clientLastMinutePreferences)
    .innerJoin(clients, eq(clientLastMinutePreferences.clientId, clients.id))
    .where(eq(clientLastMinutePreferences.trainerId, trainerId));

  const orphans = prefs.filter(
    (pref) => !allowed.has(templateSlotKey(pref.dayOfWeek, pref.startTime)),
  );

  if (orphans.length === 0) {
    return { deleted: 0, prunedClients: [] };
  }

  const orphanIds = orphans.map((pref) => pref.id);
  const affectedClientIds = [...new Set(orphans.map((pref) => pref.clientId))];

  await db
    .delete(clientLastMinutePreferences)
    .where(inArray(clientLastMinutePreferences.id, orphanIds));

  const remaining = await db
    .select({
      clientId: clientLastMinutePreferences.clientId,
    })
    .from(clientLastMinutePreferences)
    .where(
      and(
        eq(clientLastMinutePreferences.trainerId, trainerId),
        inArray(clientLastMinutePreferences.clientId, affectedClientIds),
      ),
    );

  const remainingByClient = new Map<string, number>();
  for (const row of remaining) {
    remainingByClient.set(
      row.clientId,
      (remainingByClient.get(row.clientId) ?? 0) + 1,
    );
  }

  const optedOutClientIds = affectedClientIds.filter(
    (clientId) => !remainingByClient.has(clientId),
  );

  if (optedOutClientIds.length > 0) {
    await db
      .update(clients)
      .set({ lastMinuteOptIn: false })
      .where(inArray(clients.id, optedOutClientIds));
  }

  const prunedByClient = new Map<string, PrunedLastMinuteClient>();
  for (const orphan of orphans) {
    const existing = prunedByClient.get(orphan.clientId);
    if (existing) {
      existing.removed.push({
        dayOfWeek: orphan.dayOfWeek,
        startTime: orphan.startTime,
      });
      continue;
    }
    prunedByClient.set(orphan.clientId, {
      clientId: orphan.clientId,
      clientName: orphan.clientName,
      email: orphan.email,
      token: orphan.token,
      pruneNotify: orphan.pruneNotify,
      removed: [
        { dayOfWeek: orphan.dayOfWeek, startTime: orphan.startTime },
      ],
      remainingCount: remainingByClient.get(orphan.clientId) ?? 0,
      optedOut: optedOutClientIds.includes(orphan.clientId),
    });
  }

  return {
    deleted: orphanIds.length,
    prunedClients: [...prunedByClient.values()],
  };
}

export async function notifyClientsOfLastMinutePrune(
  trainerId: string,
  prunedClients: PrunedLastMinuteClient[],
): Promise<void> {
  const { sendLastMinutePruneEmail } = await import("@/lib/email");
  for (const client of prunedClients) {
    if (!client.pruneNotify || !hasClientEmail(client.email)) continue;
    if (client.removed.length === 0) continue;
    await sendLastMinutePruneEmail({
      trainerId,
      to: client.email,
      clientName: client.clientName,
      clientToken: client.token,
      removed: client.removed,
      optedOut: client.optedOut,
    });
  }
}

export async function getClientLastMinutePreferences(clientId: string) {
  const db = getDb();
  const prefs = await db
    .select()
    .from(clientLastMinutePreferences)
    .where(eq(clientLastMinutePreferences.clientId, clientId));

  return prefs.map((p) => ({
    dayOfWeek: p.dayOfWeek,
    startTime: p.startTime,
  }));
}

export async function setClientLastMinutePreferences(
  clientId: string,
  trainerId: string,
  preferences: LastMinuteSlotRef[],
) {
  const db = getDb();

  const unique = new Map<string, LastMinuteSlotRef>();
  for (const pref of preferences) {
    unique.set(`${pref.dayOfWeek}-${pref.startTime}`, pref);
  }
  const normalized = [...unique.values()];

  if (normalized.length > 0) {
    const templateSlots = await getTrainerTemplateOverlay(trainerId);
    if (templateSlots.length === 0) {
      throw new Error(
        "Your trainer has not set up a weekly template yet.",
      );
    }

    const allowed = new Set(
      templateSlots.map((slot) =>
        templateSlotKey(slot.dayOfWeek, slot.startTime),
      ),
    );

    for (const pref of normalized) {
      if (!isScheduleTimeAligned(pref.startTime)) {
        throw new Error(`Invalid time: ${pref.startTime}`);
      }
      if (!allowed.has(templateSlotKey(pref.dayOfWeek, pref.startTime))) {
        throw new Error(
          `${dayOfWeekLabel(pref.dayOfWeek)} ${pref.startTime} is not an available session time`,
        );
      }
    }
  }

  await db
    .delete(clientLastMinutePreferences)
    .where(eq(clientLastMinutePreferences.clientId, clientId));

  if (normalized.length === 0) {
    await db
      .update(clients)
      .set({ lastMinuteOptIn: false })
      .where(eq(clients.id, clientId));
    return;
  }

  const ts = nowIso();
  await db.insert(clientLastMinutePreferences).values(
    normalized.map((pref) => ({
      id: nanoid(),
      trainerId,
      clientId,
      dayOfWeek: pref.dayOfWeek,
      startTime: pref.startTime,
      createdAt: ts,
    })),
  );

  await db
    .update(clients)
    .set({ lastMinuteOptIn: true })
    .where(eq(clients.id, clientId));
}
