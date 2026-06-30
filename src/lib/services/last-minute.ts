import { nanoid } from "nanoid";
import { eq, and, asc, gte, lt, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  clientLastMinutePreferences,
  lastMinuteInterests,
  locations,
  slots,
  trainers,
} from "@/lib/db/schema";
import {
  addHours,
  addDays,
  formatDate,
  nowIso,
  parseDateOnly,
  parseLocalDateTime,
  slotDayOfWeek,
  slotTimeLabel,
} from "@/lib/constants";
import {
  sendWhatsAppLastMinute,
  sendWhatsAppLastMinuteAcceptedToTrainer,
  sendWhatsAppLastMinuteDeclinedToTrainer,
} from "@/lib/whatsapp";
import { createBookingForSlot } from "./bookings";
import { getTrainerSettings } from "./settings";
import { getTrainerTemplateOverlay } from "./templates";
import { dayOfWeekLabel } from "@/lib/schedule-grid";
import { isScheduleTimeAligned } from "@/lib/constants";

export type LastMinuteSlotRef = { dayOfWeek: number; startTime: string };

export type LastMinuteTemplateSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  locationId: string;
  locationName: string;
};

function templateSlotKey(dayOfWeek: number, startTime: string): string {
  return `${dayOfWeek}-${startTime}`;
}

export function filterTemplateSlotsForClient(
  templateSlots: LastMinuteTemplateSlot[],
  enabledLocationIds: string[],
): LastMinuteTemplateSlot[] {
  if (enabledLocationIds.length === 0) return [];
  const enabled = new Set(enabledLocationIds);
  return templateSlots.filter((slot) => enabled.has(slot.locationId));
}

export function filterPreferencesToTemplateSlots(
  preferences: LastMinuteSlotRef[],
  templateSlots: LastMinuteTemplateSlot[],
): LastMinuteSlotRef[] {
  const allowed = new Set(
    templateSlots.map((slot) => templateSlotKey(slot.dayOfWeek, slot.startTime)),
  );
  return preferences.filter((pref) =>
    allowed.has(templateSlotKey(pref.dayOfWeek, pref.startTime)),
  );
}

export type LastMinuteOfferStatus =
  | "offered"
  | "accepted"
  | "expired"
  | "superseded"
  | "declined";

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

function slotMatchesPreference(
  startAt: string,
  pref: LastMinuteSlotRef,
): boolean {
  return (
    slotDayOfWeek(startAt) === pref.dayOfWeek &&
    slotTimeLabel(startAt) === pref.startTime
  );
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

export async function listLastMinuteOpenSlots(trainerId: string) {
  await clearExpiredSlotHolds(trainerId);

  const db = getDb();
  const openSlots = await db
    .select({
      slot: slots,
      location: locations,
      heldClient: clients,
    })
    .from(slots)
    .leftJoin(locations, eq(slots.locationId, locations.id))
    .leftJoin(clients, eq(slots.heldForClientId, clients.id))
    .where(and(eq(slots.trainerId, trainerId), eq(slots.status, "available")))
    .orderBy(asc(slots.startAt));

  const results = [];
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

    results.push({
      slot: row.slot,
      location: row.location,
      heldClient: row.heldClient,
      offers: offers.map(({ offer, client }) => ({
        id: offer.id,
        clientId: client.id,
        clientName: client.name,
        status: offer.status as LastMinuteOfferStatus,
        expiresAt: offer.expiresAt,
        createdAt: offer.createdAt,
      })),
    });
  }

  return results;
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

export async function sendLastMinuteOffer(
  trainerId: string,
  slotId: string,
  clientId: string,
) {
  await clearExpiredSlotHolds(trainerId);

  const db = getDb();
  const slot = await db.query.slots.findFirst({
    where: and(eq(slots.id, slotId), eq(slots.trainerId, trainerId)),
  });
  if (!slot || slot.status !== "available") {
    throw new Error("Slot is not available");
  }
  if (parseLocalDateTime(slot.startAt).getTime() < Date.now()) {
    throw new Error("Cannot send offers for past slots");
  }

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)),
  });
  if (!client) throw new Error("Client not found");
  if (!client.lastMinuteOptIn) {
    throw new Error("Client is not opted in to last-minute alerts");
  }

  const prefs = await getClientLastMinutePreferences(clientId);
  if (!prefs.some((pref) => slotMatchesPreference(slot.startAt, pref))) {
    throw new Error("This slot does not match the client's time preferences");
  }

  const { lastMinuteOfferLockHours } = await getTrainerSettings(trainerId);
  const offeredAt = nowIso();
  const expiresAt = addHours(offeredAt, lastMinuteOfferLockHours);

  if (slot.heldForClientId && slot.heldForClientId !== clientId) {
    const previousOffers = await db
      .select()
      .from(lastMinuteInterests)
      .where(
        and(
          eq(lastMinuteInterests.slotId, slotId),
          eq(lastMinuteInterests.status, "offered"),
        ),
      );

    for (const offer of previousOffers) {
      await db
        .update(lastMinuteInterests)
        .set({ status: "superseded" })
        .where(eq(lastMinuteInterests.id, offer.id));
    }
  }

  await db
    .update(slots)
    .set({
      heldForClientId: clientId,
      holdExpiresAt: expiresAt,
    })
    .where(eq(slots.id, slotId));

  const existingActive = await db.query.lastMinuteInterests.findFirst({
    where: and(
      eq(lastMinuteInterests.slotId, slotId),
      eq(lastMinuteInterests.clientId, clientId),
      eq(lastMinuteInterests.status, "offered"),
    ),
  });

  if (existingActive) {
    await db
      .update(lastMinuteInterests)
      .set({ expiresAt, createdAt: offeredAt })
      .where(eq(lastMinuteInterests.id, existingActive.id));
  } else {
    await db.insert(lastMinuteInterests).values({
      id: nanoid(),
      trainerId,
      slotId,
      clientId,
      status: "offered",
      token: nanoid(12),
      expiresAt,
      createdAt: offeredAt,
    });
  }

  await sendWhatsAppLastMinute({
    trainerId,
    clientId: client.id,
    phone: client.phone,
    slotId,
    slotStartAt: slot.startAt,
    slotEndAt: slot.endAt,
    clientName: client.name,
    lockHours: lastMinuteOfferLockHours,
  });

  return { expiresAt, lockHours: lastMinuteOfferLockHours };
}

export type LastMinuteOfferPreview = {
  clientName: string;
  clientToken: string;
  slotStartAt: string;
  slotEndAt: string;
  locationName: string | null;
  expiresAt: string | null;
  canAccept: boolean;
  unavailableReason: string | null;
};

export async function getLastMinuteOfferPreview(
  slotId: string,
  clientId: string,
): Promise<LastMinuteOfferPreview | null> {
  const db = getDb();
  let slot = await db.query.slots.findFirst({ where: eq(slots.id, slotId) });
  if (!slot) return null;

  await clearExpiredSlotHolds(slot.trainerId);
  slot =
    (await db.query.slots.findFirst({ where: eq(slots.id, slotId) })) ?? slot;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
  if (!client) return null;

  const offer = await db.query.lastMinuteInterests.findFirst({
    where: and(
      eq(lastMinuteInterests.slotId, slotId),
      eq(lastMinuteInterests.clientId, clientId),
      eq(lastMinuteInterests.status, "offered"),
    ),
  });

  const location = slot.locationId
    ? await db.query.locations.findFirst({
        where: eq(locations.id, slot.locationId),
      })
    : null;

  const now = nowIso();
  const expiresAt = slot.holdExpiresAt ?? offer?.expiresAt ?? null;

  let unavailableReason: string | null = null;
  if (slot.status !== "available") {
    unavailableReason = "This slot is no longer available.";
  } else if (!offer) {
    unavailableReason = "No active offer found for this slot.";
  } else if (slot.heldForClientId !== clientId) {
    unavailableReason = "This offer is no longer reserved for you.";
  } else if (!expiresAt || expiresAt < now) {
    unavailableReason =
      "This offer has expired. Please contact your trainer if you still want the slot.";
  }

  return {
    clientName: client.name,
    clientToken: client.token,
    slotStartAt: slot.startAt,
    slotEndAt: slot.endAt,
    locationName: location?.name ?? null,
    expiresAt,
    canAccept: unavailableReason == null,
    unavailableReason,
  };
}

export async function acceptLastMinuteOffer(slotId: string, clientId: string) {
  const db = getDb();
  let slot = await db.query.slots.findFirst({ where: eq(slots.id, slotId) });
  if (!slot || slot.status !== "available") {
    throw new Error("This slot is no longer available");
  }

  await clearExpiredSlotHolds(slot.trainerId);
  slot =
    (await db.query.slots.findFirst({ where: eq(slots.id, slotId) })) ?? slot;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
  if (!client) throw new Error("Client not found");

  const now = nowIso();
  if (
    slot.heldForClientId !== clientId ||
    !slot.holdExpiresAt ||
    slot.holdExpiresAt < now
  ) {
    throw new Error(
      "This offer is no longer active. Please contact your trainer.",
    );
  }

  const offer = await db.query.lastMinuteInterests.findFirst({
    where: and(
      eq(lastMinuteInterests.slotId, slotId),
      eq(lastMinuteInterests.clientId, clientId),
      eq(lastMinuteInterests.status, "offered"),
    ),
  });
  if (!offer) {
    throw new Error("No active offer found for this slot");
  }

  const booking = await createBookingForSlot({
    slotId,
    clientId,
    trainerId: slot.trainerId,
    sendConfirmation: true,
  });

  await db
    .update(lastMinuteInterests)
    .set({ status: "accepted" })
    .where(eq(lastMinuteInterests.id, offer.id));

  const otherOffers = await db
    .select()
    .from(lastMinuteInterests)
    .where(
      and(
        eq(lastMinuteInterests.slotId, slotId),
        eq(lastMinuteInterests.status, "offered"),
      ),
    );

  for (const other of otherOffers) {
    await db
      .update(lastMinuteInterests)
      .set({ status: "superseded" })
      .where(eq(lastMinuteInterests.id, other.id));
  }

  await db
    .update(slots)
    .set({ heldForClientId: null, holdExpiresAt: null })
    .where(eq(slots.id, slotId));

  const trainer = await db.query.trainers.findFirst({
    where: eq(trainers.id, slot.trainerId),
  });
  if (trainer) {
    await sendWhatsAppLastMinuteAcceptedToTrainer({
      trainerId: slot.trainerId,
      clientId: client.id,
      clientName: client.name,
      trainerEmail: trainer.email,
      slotStartAt: slot.startAt,
      slotEndAt: slot.endAt,
    });
  }

  return { alreadyRegistered: false, booking, client, slot };
}

export async function declineLastMinuteOffer(slotId: string, clientId: string) {
  const db = getDb();
  let slot = await db.query.slots.findFirst({ where: eq(slots.id, slotId) });
  if (!slot || slot.status !== "available") {
    throw new Error("This slot is no longer available");
  }

  await clearExpiredSlotHolds(slot.trainerId);
  slot =
    (await db.query.slots.findFirst({ where: eq(slots.id, slotId) })) ?? slot;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
  if (!client) throw new Error("Client not found");

  const now = nowIso();
  if (
    slot.heldForClientId !== clientId ||
    !slot.holdExpiresAt ||
    slot.holdExpiresAt < now
  ) {
    throw new Error(
      "This offer is no longer active. Please contact your trainer.",
    );
  }

  const offer = await db.query.lastMinuteInterests.findFirst({
    where: and(
      eq(lastMinuteInterests.slotId, slotId),
      eq(lastMinuteInterests.clientId, clientId),
      eq(lastMinuteInterests.status, "offered"),
    ),
  });
  if (!offer) {
    throw new Error("No active offer found for this slot");
  }

  await db
    .update(lastMinuteInterests)
    .set({ status: "declined" })
    .where(eq(lastMinuteInterests.id, offer.id));

  await db
    .update(slots)
    .set({ heldForClientId: null, holdExpiresAt: null })
    .where(eq(slots.id, slotId));

  const trainer = await db.query.trainers.findFirst({
    where: eq(trainers.id, slot.trainerId),
  });
  if (trainer) {
    await sendWhatsAppLastMinuteDeclinedToTrainer({
      trainerId: slot.trainerId,
      clientId: client.id,
      clientName: client.name,
      trainerEmail: trainer.email,
      slotStartAt: slot.startAt,
      slotEndAt: slot.endAt,
    });
  }

  return { client, slot };
}

/** @deprecated use acceptLastMinuteOffer */
export async function expressInterest(slotId: string, clientId: string) {
  try {
    const result = await acceptLastMinuteOffer(slotId, clientId);
    return {
      alreadyRegistered: false,
      interest: null,
      client: result.client,
      slot: result.slot,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong";
    if (message.includes("no longer active")) {
      return {
        alreadyRegistered: true,
        interest: null,
        client: null,
        slot: null,
      };
    }
    throw e;
  }
}

export async function listOpenLastMinuteSlots(trainerId: string) {
  return listLastMinuteOpenSlots(trainerId);
}

export async function assignLastMinuteSlot(
  slotId: string,
  clientId: string,
  trainerId: string,
) {
  await sendLastMinuteOffer(trainerId, slotId, clientId);
}
