import { eq, and, asc, gte, lt, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  clientLastMinutePreferences,
  lastMinuteInterests,
  locations,
  slots,
} from "@/lib/db/schema";
import {
  addDays,
  formatDate,
  nowIso,
  parseDateOnly,
  slotDayOfWeek,
  slotTimeLabel,
} from "@/lib/constants";
import { getTrainerSettings } from "./settings";
import {
  slotMatchesPreference,
  type LastMinuteOfferStatus,
  type LastMinuteSlotRef,
} from "./last-minute-shared";

export async function clearExpiredSlotHolds(trainerId: string) {
  const db = getDb();
  const now = nowIso();

  const heldSlots = await db
    .select()
    .from(slots)
    .where(
      and(eq(slots.trainerId, trainerId), eq(slots.status, "available")),
    );

  for (const slot of heldSlots) {
    if (!slot.holdExpiresAt || slot.holdExpiresAt >= now) continue;

    await db
      .update(slots)
      .set({ heldForClientId: null, holdExpiresAt: null })
      .where(eq(slots.id, slot.id));

    const activeOffers = await db
      .select()
      .from(lastMinuteInterests)
      .where(
        and(
          eq(lastMinuteInterests.slotId, slot.id),
          eq(lastMinuteInterests.status, "offered"),
        ),
      );

    for (const offer of activeOffers) {
      await db
        .update(lastMinuteInterests)
        .set({ status: "expired" })
        .where(eq(lastMinuteInterests.id, offer.id));
    }
  }
}

export async function buildEligibleCountIndex(trainerId: string) {
  const db = getDb();
  const prefRows = await db
    .select({
      dayOfWeek: clientLastMinutePreferences.dayOfWeek,
      startTime: clientLastMinutePreferences.startTime,
    })
    .from(clientLastMinutePreferences)
    .innerJoin(clients, eq(clientLastMinutePreferences.clientId, clients.id))
    .where(
      and(eq(clients.trainerId, trainerId), eq(clients.lastMinuteOptIn, true)),
    );

  const prefIndex = new Map<string, number>();
  for (const pref of prefRows) {
    const key = `${pref.dayOfWeek}-${pref.startTime}`;
    prefIndex.set(key, (prefIndex.get(key) ?? 0) + 1);
  }
  return prefIndex;
}

export type EligibleClientSummary = {
  id: string;
  name: string;
  phone: string;
  email: string;
  preferredNotifyChannel: "email" | "whatsapp";
  isHeld: boolean;
  latestOffer: {
    status: LastMinuteOfferStatus;
    expiresAt: string | null;
    createdAt: string;
  } | null;
};

type OpenSlotForEligibility = {
  id: string;
  startAt: string;
  heldForClientId: string | null;
};

function slotPreferenceKey(startAt: string): string {
  return `${slotDayOfWeek(startAt)}-${slotTimeLabel(startAt)}`;
}

/** Batch-load eligible clients for open slots (avoids per-client queries in the modal). */
export async function buildEligibleClientsBySlotId(
  trainerId: string,
  openSlots: OpenSlotForEligibility[],
  prefIndex: Map<string, number>,
): Promise<Map<string, EligibleClientSummary[]>> {
  const slotsNeedingClients = openSlots.filter(
    (slot) => (prefIndex.get(slotPreferenceKey(slot.startAt)) ?? 0) > 0,
  );
  if (slotsNeedingClients.length === 0) return new Map();

  const db = getDb();
  const clientPrefRows = await db
    .select({
      clientId: clients.id,
      name: clients.name,
      phone: clients.phone,
      email: clients.email,
      preferredNotifyChannel: clients.preferredNotifyChannel,
      dayOfWeek: clientLastMinutePreferences.dayOfWeek,
      startTime: clientLastMinutePreferences.startTime,
    })
    .from(clientLastMinutePreferences)
    .innerJoin(clients, eq(clientLastMinutePreferences.clientId, clients.id))
    .where(
      and(eq(clients.trainerId, trainerId), eq(clients.lastMinuteOptIn, true)),
    );

  type ClientRecord = {
    id: string;
    name: string;
    phone: string;
    email: string;
    preferredNotifyChannel: "email" | "whatsapp";
    prefs: LastMinuteSlotRef[];
  };
  const clientMap = new Map<string, ClientRecord>();
  for (const row of clientPrefRows) {
    let client = clientMap.get(row.clientId);
    if (!client) {
      client = {
        id: row.clientId,
        name: row.name,
        phone: row.phone,
        email: row.email,
        preferredNotifyChannel:
          row.preferredNotifyChannel === "email" ? "email" : "whatsapp",
        prefs: [],
      };
      clientMap.set(row.clientId, client);
    }
    client.prefs.push({
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
    });
  }

  const slotIds = slotsNeedingClients.map((slot) => slot.id);
  const offerRows = await db
    .select()
    .from(lastMinuteInterests)
    .where(inArray(lastMinuteInterests.slotId, slotIds))
    .orderBy(asc(lastMinuteInterests.createdAt));

  const latestOfferBySlotClient = new Map<
    string,
    (typeof offerRows)[number]
  >();
  for (const offer of offerRows) {
    latestOfferBySlotClient.set(`${offer.slotId}:${offer.clientId}`, offer);
  }

  const result = new Map<string, EligibleClientSummary[]>();
  for (const slot of slotsNeedingClients) {
    const eligible: EligibleClientSummary[] = [];
    for (const client of clientMap.values()) {
      if (!client.prefs.some((pref) => slotMatchesPreference(slot.startAt, pref))) {
        continue;
      }
      const latest = latestOfferBySlotClient.get(`${slot.id}:${client.id}`);
      eligible.push({
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        preferredNotifyChannel: client.preferredNotifyChannel,
        isHeld: slot.heldForClientId === client.id,
        latestOffer: latest
          ? {
              status: latest.status as LastMinuteOfferStatus,
              expiresAt: latest.expiresAt,
              createdAt: latest.createdAt,
            }
          : null,
      });
    }
    result.set(
      slot.id,
      eligible.sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  return result;
}

function eligibleCountFor(
  prefIndex: Map<string, number>,
  startAt: string,
): number {
  const key = `${slotDayOfWeek(startAt)}-${slotTimeLabel(startAt)}`;
  return prefIndex.get(key) ?? 0;
}

export type LastMinuteWeekSlot = {
  slotId: string;
  startAt: string;
  locationName: string | null;
  heldForClientId: string | null;
  heldClientName: string | null;
  holdExpiresAt: string | null;
  eligibleCount: number;
  offers: {
    id: string;
    clientId: string;
    clientName: string;
    status: LastMinuteOfferStatus;
    expiresAt: string | null;
  }[];
};

export async function getLastMinuteWeekView(
  trainerId: string,
  weekStart: string,
) {
  await clearExpiredSlotHolds(trainerId);

  const settings = await getTrainerSettings(trainerId);
  const start = parseDateOnly(weekStart);
  const end = addDays(start, 7);
  const startAtMin = `${formatDate(start)}T00:00:00`;
  const startAtMax = `${formatDate(end)}T00:00:00`;

  const db = getDb();

  const prefIndex = await buildEligibleCountIndex(trainerId);

  function eligibleCountForSlot(startAt: string): number {
    return eligibleCountFor(prefIndex, startAt);
  }

  const openSlots = await db
    .select({
      slot: slots,
      location: locations,
      heldClient: clients,
    })
    .from(slots)
    .leftJoin(locations, eq(slots.locationId, locations.id))
    .leftJoin(clients, eq(slots.heldForClientId, clients.id))
    .where(
      and(
        eq(slots.trainerId, trainerId),
        eq(slots.status, "available"),
        gte(slots.startAt, startAtMin),
        lt(slots.startAt, startAtMax),
      ),
    )
    .orderBy(asc(slots.startAt));

  const weekSlots: LastMinuteWeekSlot[] = [];
  for (const row of openSlots) {
    const offers = await db
      .select({
        offer: lastMinuteInterests,
        client: clients,
      })
      .from(lastMinuteInterests)
      .innerJoin(clients, eq(lastMinuteInterests.clientId, clients.id))
      .where(eq(lastMinuteInterests.slotId, row.slot.id))
      .orderBy(asc(lastMinuteInterests.createdAt));

    weekSlots.push({
      slotId: row.slot.id,
      startAt: row.slot.startAt,
      locationName: row.location?.name ?? null,
      heldForClientId: row.slot.heldForClientId,
      heldClientName: row.heldClient?.name ?? null,
      holdExpiresAt: row.slot.holdExpiresAt,
      eligibleCount: eligibleCountForSlot(row.slot.startAt),
      offers: offers.map(({ offer, client }) => ({
        id: offer.id,
        clientId: client.id,
        clientName: client.name,
        status: offer.status as LastMinuteOfferStatus,
        expiresAt: offer.expiresAt,
      })),
    });
  }

  return {
    weekStart: formatDate(start),
    weekEnd: formatDate(addDays(start, 6)),
    lockHours: settings.lastMinuteOfferLockHours,
    scheduleStartTime: settings.scheduleStartTime,
    scheduleEndTime: settings.scheduleEndTime,
    slots: weekSlots,
  };
}

export async function getEligibleClientsForSlot(
  trainerId: string,
  slotId: string,
) {
  await clearExpiredSlotHolds(trainerId);

  const db = getDb();
  const slot = await db.query.slots.findFirst({
    where: and(eq(slots.id, slotId), eq(slots.trainerId, trainerId)),
  });
  if (!slot || slot.status !== "available") {
    throw new Error("Slot is not available");
  }

  const prefIndex = await buildEligibleCountIndex(trainerId);
  const bySlot = await buildEligibleClientsBySlotId(
    trainerId,
    [
      {
        id: slot.id,
        startAt: slot.startAt,
        heldForClientId: slot.heldForClientId,
      },
    ],
    prefIndex,
  );

  return {
    slot,
    heldClientId: slot.heldForClientId,
    holdExpiresAt: slot.holdExpiresAt,
    clients: bySlot.get(slot.id) ?? [],
  };
}
