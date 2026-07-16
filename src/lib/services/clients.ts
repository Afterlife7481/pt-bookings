import { nanoid } from "nanoid";
import { eq, and, ne, desc, inArray, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  clientLocations,
  recurringPreferences,
  bookings,
  slots,
  locations,
} from "@/lib/db/schema";
import { clientHomeUrl, nowIso } from "@/lib/constants";
import { getClientLocationOptions, getEnabledClientLocationIds } from "@/lib/services/locations";
import { getTrainerTemplate, getTrainerTemplateOverlay } from "@/lib/services/templates";
import { dayOfWeekLabel } from "@/lib/schedule-grid";
import { normalizeClientPhone } from "@/lib/whatsapp-link";
import {
  hasClientEmail,
  parsePreferredNotifyChannel,
  type PreferredNotifyChannel,
} from "@/lib/notify-channels";

function normalizeOptionalClientPhone(phone: string | undefined): string {
  const trimmed = (phone ?? "").trim();
  if (!trimmed) return "";
  return normalizeClientPhone(trimmed);
}

function assertClientHasContact(email: string, phone: string) {
  if (!hasClientEmail(email) && !phone) {
    throw new Error("Add a phone number or an email address");
  }
}

function assertNotifyChannelContact(
  channel: PreferredNotifyChannel,
  email: string,
  phone: string,
) {
  if (channel === "whatsapp" && !phone) {
    throw new Error(
      "Add a phone number for WhatsApp, or switch preference to Email",
    );
  }
  if (channel === "email" && !hasClientEmail(email)) {
    throw new Error(
      "Add an email for email notifications, or switch preference to WhatsApp",
    );
  }
}

export type RecurringSlotRef = {
  dayOfWeek: number;
  startTime: string;
  locationId: string;
};

export type RecurringSlotAssignment = {
  dayOfWeek: number;
  startTime: string;
  clientId: string;
  clientName: string;
  locationName: string | null;
  isCurrentClient: boolean;
};

export async function getRecurringSlotAssignments(
  trainerId: string,
  clientId: string,
): Promise<RecurringSlotAssignment[]> {
  const db = getDb();
  const templateOverlay = await getTrainerTemplateOverlay(trainerId);
  const overlayByKey = new Map(
    templateOverlay.map((slot) => [
      `${slot.dayOfWeek}-${slot.startTime}`,
      slot.locationName,
    ]),
  );

  const prefs = await db
    .select({
      pref: recurringPreferences,
      client: clients,
      location: locations,
    })
    .from(recurringPreferences)
    .innerJoin(clients, eq(recurringPreferences.clientId, clients.id))
    .leftJoin(locations, eq(recurringPreferences.locationId, locations.id))
    .where(eq(recurringPreferences.trainerId, trainerId));

  return prefs
    .map(({ pref, client, location }) => ({
      dayOfWeek: pref.dayOfWeek,
      startTime: pref.startTime,
      clientId: client.id,
      clientName: client.name,
      locationName:
        location?.name ??
        overlayByKey.get(`${pref.dayOfWeek}-${pref.startTime}`) ??
        null,
      isCurrentClient: client.id === clientId,
    }))
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });
}

async function getLastSessionsByClientId(
  trainerId: string,
  clientIds: string[],
): Promise<Map<string, { startAt: string; endAt: string }>> {
  if (clientIds.length === 0) return new Map();

  const db = getDb();
  const rows = await db
    .select({
      clientId: bookings.clientId,
      startAt: slots.startAt,
      endAt: slots.endAt,
    })
    .from(bookings)
    .innerJoin(slots, eq(bookings.slotId, slots.id))
    .where(
      and(
        eq(bookings.trainerId, trainerId),
        inArray(bookings.clientId, clientIds),
        ne(bookings.status, "canceled"),
        lt(slots.startAt, nowIso()),
      ),
    )
    .orderBy(desc(slots.startAt));

  const map = new Map<string, { startAt: string; endAt: string }>();
  for (const row of rows) {
    if (!map.has(row.clientId)) {
      map.set(row.clientId, { startAt: row.startAt, endAt: row.endAt });
    }
  }
  return map;
}

export async function listClients(trainerId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.trainerId, trainerId));

  const clientIds = rows.map((c) => c.id);
  const enabledRows =
    clientIds.length > 0
      ? await db
          .select({
            clientId: clientLocations.clientId,
            locationId: clientLocations.locationId,
          })
          .from(clientLocations)
          .where(inArray(clientLocations.clientId, clientIds))
      : [];

  const enabledByClient = new Map<string, string[]>();
  for (const row of enabledRows) {
    const list = enabledByClient.get(row.clientId) ?? [];
    list.push(row.locationId);
    enabledByClient.set(row.clientId, list);
  }

  const lastSessions = await getLastSessionsByClientId(trainerId, clientIds);

  return Promise.all(
    rows.map(async (c) => {
      const prefs = await db
        .select()
        .from(recurringPreferences)
        .where(eq(recurringPreferences.clientId, c.id));
      return {
        ...c,
        enabledLocationIds: enabledByClient.get(c.id) ?? [],
        recurringPreferences: prefs.map((p) => ({
          dayOfWeek: p.dayOfWeek,
          startTime: p.startTime,
          locationId: p.locationId,
        })),
        lastSession: lastSessions.get(c.id) ?? null,
      };
    }),
  );
}

export async function createClient(params: {
  trainerId: string;
  name: string;
  phone: string;
  email?: string;
  preferredNotifyChannel?: PreferredNotifyChannel;
  lastMinuteOptIn?: boolean;
  sessionPrice?: number | null;
}) {
  const db = getDb();
  const id = nanoid();
  const token = nanoid(12);
  const createdAt = nowIso();

  if (
    params.sessionPrice != null &&
    (!Number.isInteger(params.sessionPrice) || params.sessionPrice < 0)
  ) {
    throw new Error("Session price must be zero or greater");
  }

  const email = (params.email ?? "").trim();
  const phone = normalizeOptionalClientPhone(params.phone);
  assertClientHasContact(email, phone);

  let preferredNotifyChannel = params.preferredNotifyChannel
    ? parsePreferredNotifyChannel(params.preferredNotifyChannel)
    : phone
      ? "whatsapp"
      : "email";
  if (preferredNotifyChannel === "whatsapp" && !phone && hasClientEmail(email)) {
    preferredNotifyChannel = "email";
  } else if (
    preferredNotifyChannel === "email" &&
    !hasClientEmail(email) &&
    phone
  ) {
    preferredNotifyChannel = "whatsapp";
  }
  assertNotifyChannelContact(preferredNotifyChannel, email, phone);

  await db.insert(clients).values({
    id,
    token,
    trainerId: params.trainerId,
    name: params.name,
    email,
    phone,
    preferredNotifyChannel,
    lastMinuteOptIn: params.lastMinuteOptIn ?? false,
    sessionPrice: params.sessionPrice ?? null,
    createdAt,
  });

  return id;
}

export async function getClientForTrainer(trainerId: string, clientId: string) {
  const db = getDb();
  return db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)),
  });
}

export async function getClientDetail(trainerId: string, clientId: string) {
  const client = await getClientForTrainer(trainerId, clientId);
  if (!client) return null;

  const db = getDb();
  const prefs = await db
    .select()
    .from(recurringPreferences)
    .where(eq(recurringPreferences.clientId, clientId));

  const clientBookings = await db
    .select({
      booking: bookings,
      slot: slots,
    })
    .from(bookings)
    .leftJoin(slots, eq(bookings.slotId, slots.id))
    .where(
      and(eq(bookings.clientId, clientId), eq(bookings.trainerId, trainerId)),
    )
    .orderBy(desc(bookings.sessionStartAt));

  return {
    ...client,
    portalUrl: clientHomeUrl(client.token),
    recurringPreferences: prefs.map((p) => ({
      dayOfWeek: p.dayOfWeek,
      startTime: p.startTime,
      locationId: p.locationId,
    })),
    locations: await getClientLocationOptions(trainerId, clientId),
    bookings: clientBookings.map(({ booking, slot }) => ({
      id: booking.id,
      token: booking.token,
      status: booking.status,
      isRecurring: booking.isRecurring,
      sessionStartAt: booking.sessionStartAt,
      slotStartAt: slot?.startAt ?? booking.sessionStartAt,
      slotEndAt: slot?.endAt ?? null,
    })),
  };
}

export async function updateClient(
  trainerId: string,
  clientId: string,
  updates: {
    name?: string;
    phone?: string;
    email?: string;
    preferredNotifyChannel?: PreferredNotifyChannel;
    lastMinuteOptIn?: boolean;
    sessionPrice?: number | null;
  },
) {
  const client = await getClientForTrainer(trainerId, clientId);
  if (!client) throw new Error("Client not found");

  const patch: {
    name?: string;
    phone?: string;
    email?: string;
    preferredNotifyChannel?: PreferredNotifyChannel;
    lastMinuteOptIn?: boolean;
    sessionPrice?: number | null;
  } = {};

  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (!name) throw new Error("Name is required");
    patch.name = name;
  }
  if (updates.phone !== undefined) {
    patch.phone = normalizeOptionalClientPhone(updates.phone);
  }
  if (updates.email !== undefined) {
    patch.email = updates.email.trim();
  }
  if (updates.preferredNotifyChannel !== undefined) {
    patch.preferredNotifyChannel = parsePreferredNotifyChannel(
      updates.preferredNotifyChannel,
    );
  }
  if (updates.lastMinuteOptIn !== undefined) {
    patch.lastMinuteOptIn = updates.lastMinuteOptIn;
  }
  if (updates.sessionPrice !== undefined) {
    if (
      updates.sessionPrice != null &&
      (!Number.isInteger(updates.sessionPrice) || updates.sessionPrice < 0)
    ) {
      throw new Error("Session price must be zero or greater");
    }
    patch.sessionPrice = updates.sessionPrice;
  }

  if (Object.keys(patch).length === 0) return;

  const nextEmail = patch.email ?? client.email;
  const nextPhone = patch.phone ?? client.phone;
  const nextChannel = patch.preferredNotifyChannel ?? client.preferredNotifyChannel;
  assertClientHasContact(nextEmail, nextPhone);
  assertNotifyChannelContact(nextChannel, nextEmail, nextPhone);

  const db = getDb();
  await db.update(clients).set(patch).where(eq(clients.id, clientId));
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

  if (slots.length > 0) {
    const template = await getTrainerTemplate(trainerId);
    if (!template) {
      throw new Error(
        "Create a weekly template before assigning recurring slots",
      );
    }

    const enabledLocationIds = await getEnabledClientLocationIds(clientId);
    if (enabledLocationIds.length === 0) {
      throw new Error(
        "Select at least one available location for this client before adding recurring slots",
      );
    }

    const templateByKey = new Map(
      template.slots.map((slot) => [
        `${slot.dayOfWeek}-${slot.startTime}`,
        slot,
      ]),
    );

    for (const slot of slots) {
      const templateSlot = templateByKey.get(
        `${slot.dayOfWeek}-${slot.startTime}`,
      );
      if (!templateSlot?.locationId) {
        throw new Error(
          `No weekly template slot on ${dayOfWeekLabel(slot.dayOfWeek)} at ${slot.startTime}`,
        );
      }

      if (slot.locationId !== templateSlot.locationId) {
        throw new Error(
          `${dayOfWeekLabel(slot.dayOfWeek)} ${slot.startTime} must use ${templateSlot.locationName ?? "the template location"} — recurring locations must match the weekly template`,
        );
      }

      if (!enabledLocationIds.includes(slot.locationId)) {
        throw new Error(
          `Enable ${templateSlot.locationName ?? "the template location"} for this client before assigning ${dayOfWeekLabel(slot.dayOfWeek)} ${slot.startTime}`,
        );
      }
    }
  }

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
      locationId: slot.locationId,
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
