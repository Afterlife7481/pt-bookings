import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  lastMinuteInterests,
  locations,
  slots,
  trainers,
} from "@/lib/db/schema";
import {
  addHours,
  nowIso,
} from "@/lib/constants";
import { isWallClockPast } from "@/lib/zoned-time";
import {
  sendWhatsAppLastMinute,
  sendLastMinuteEmail,
  sendWhatsAppLastMinuteAcceptedToTrainer,
  sendWhatsAppLastMinuteDeclinedToTrainer,
} from "@/lib/whatsapp";
import { assertWhatsAppPhone } from "@/lib/whatsapp-link";
import {
  hasClientEmail,
  parseNotifyChannels,
  type NotifyChannel,
} from "@/lib/notify-channels";
import { createBookingForSlot } from "./bookings";
import { getTrainerSettings } from "./settings";
import { getTrainerById } from "./trainers";
import { clearExpiredSlotHolds } from "./last-minute-eligibility";
import { getClientLastMinutePreferences } from "./last-minute-preferences";
import { slotMatchesPreference } from "./last-minute-shared";

export async function sendLastMinuteOffer(
  trainerId: string,
  slotId: string,
  clientId: string,
  channelsInput: unknown = ["whatsapp"],
) {
  const channels = parseNotifyChannels(channelsInput);
  await clearExpiredSlotHolds(trainerId);

  const db = getDb();
  const slot = await db.query.slots.findFirst({
    where: and(eq(slots.id, slotId), eq(slots.trainerId, trainerId)),
  });
  if (!slot || slot.status !== "available") {
    throw new Error("Slot is not available");
  }
  const { timezone, lastMinuteOfferLockHours } = await getTrainerSettings(trainerId);
  if (isWallClockPast(slot.startAt, timezone)) {
    throw new Error("Cannot send offers for past slots");
  }

  const holdStillActive =
    Boolean(slot.heldForClientId) &&
    Boolean(slot.holdExpiresAt) &&
    new Date(slot.holdExpiresAt!).getTime() > Date.now();

  if (
    holdStillActive &&
    slot.heldForClientId &&
    slot.heldForClientId !== clientId
  ) {
    throw new Error(
      "This slot is already held for another client until their offer expires.",
    );
  }

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)),
  });
  if (!client) throw new Error("Client not found");
  if (!client.lastMinuteOptIn) {
    throw new Error("Client is not opted in to last-minute alerts");
  }

  const wantEmail = channels.includes("email");
  const wantWhatsApp = channels.includes("whatsapp");

  if (wantEmail && !hasClientEmail(client.email)) {
    throw new Error(
      "This client has no email address. Add one on their profile, or send by WhatsApp instead.",
    );
  }
  if (wantWhatsApp) {
    assertWhatsAppPhone(client.phone);
  }

  const prefs = await getClientLastMinutePreferences(clientId);
  if (!prefs.some((pref) => slotMatchesPreference(slot.startAt, pref))) {
    throw new Error("This slot does not match the client's time preferences");
  }

  const offeredAt = nowIso();
  const expiresAt = addHours(offeredAt, lastMinuteOfferLockHours);

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

  let offerToken: string;
  if (existingActive) {
    offerToken = existingActive.token;
    await db
      .update(lastMinuteInterests)
      .set({ expiresAt, createdAt: offeredAt })
      .where(eq(lastMinuteInterests.id, existingActive.id));
  } else {
    offerToken = nanoid(12);
    await db.insert(lastMinuteInterests).values({
      id: nanoid(),
      trainerId,
      slotId,
      clientId,
      status: "offered",
      token: offerToken,
      expiresAt,
      createdAt: offeredAt,
    });
  }

  let whatsappUrl: string | null = null;
  const sentVia: NotifyChannel[] = [];

  if (wantEmail) {
    const trainer = await getTrainerById(trainerId);
    const settings = await getTrainerSettings(trainerId);
    await sendLastMinuteEmail({
      trainerId,
      clientId: client.id,
      email: client.email,
      offerToken,
      slotStartAt: slot.startAt,
      slotEndAt: slot.endAt,
      clientName: client.name,
      lockHours: lastMinuteOfferLockHours,
      replyTo: trainer?.email ?? settings.email,
    });
    sentVia.push("email");
  }

  if (wantWhatsApp) {
    const draft = await sendWhatsAppLastMinute({
      trainerId,
      clientId: client.id,
      phone: client.phone,
      offerToken,
      slotStartAt: slot.startAt,
      slotEndAt: slot.endAt,
      clientName: client.name,
      lockHours: lastMinuteOfferLockHours,
    });
    whatsappUrl = draft.sendUrl;
    sentVia.push("whatsapp");
  }

  return {
    expiresAt,
    lockHours: lastMinuteOfferLockHours,
    offerToken,
    whatsappUrl,
    sentVia,
  };
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

async function getOfferedInterestByToken(offerToken: string) {
  const db = getDb();
  return db.query.lastMinuteInterests.findFirst({
    where: and(
      eq(lastMinuteInterests.token, offerToken),
      eq(lastMinuteInterests.status, "offered"),
    ),
  });
}

export async function getLastMinuteOfferPreview(
  offerToken: string,
): Promise<LastMinuteOfferPreview | null> {
  const db = getDb();
  const offer = await getOfferedInterestByToken(offerToken);
  if (!offer) return null;

  let slot = await db.query.slots.findFirst({
    where: eq(slots.id, offer.slotId),
  });
  if (!slot) return null;

  await clearExpiredSlotHolds(slot.trainerId);
  slot =
    (await db.query.slots.findFirst({ where: eq(slots.id, offer.slotId) })) ??
    slot;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, offer.clientId),
  });
  if (!client) return null;

  const location = slot.locationId
    ? await db.query.locations.findFirst({
        where: eq(locations.id, slot.locationId),
      })
    : null;

  const now = nowIso();
  const expiresAt = slot.holdExpiresAt ?? offer.expiresAt ?? null;

  let unavailableReason: string | null = null;
  if (slot.status !== "available") {
    unavailableReason = "This slot is no longer available.";
  } else if (slot.heldForClientId !== offer.clientId) {
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

export async function acceptLastMinuteOffer(offerToken: string) {
  const db = getDb();
  const offer = await getOfferedInterestByToken(offerToken);
  if (!offer) {
    throw new Error("No active offer found for this slot");
  }

  let slot = await db.query.slots.findFirst({
    where: eq(slots.id, offer.slotId),
  });
  if (!slot || slot.status !== "available") {
    throw new Error("This slot is no longer available");
  }

  await clearExpiredSlotHolds(slot.trainerId);
  slot =
    (await db.query.slots.findFirst({ where: eq(slots.id, offer.slotId) })) ??
    slot;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, offer.clientId),
  });
  if (!client) throw new Error("Client not found");

  const now = nowIso();
  if (
    slot.heldForClientId !== offer.clientId ||
    !slot.holdExpiresAt ||
    slot.holdExpiresAt < now
  ) {
    throw new Error(
      "This offer is no longer active. Please contact your trainer.",
    );
  }

  const booking = await createBookingForSlot({
    slotId: offer.slotId,
    clientId: offer.clientId,
    trainerId: slot.trainerId,
    // Confirmation WhatsApp is trainer-initiated; do not auto-log a draft.
    sendConfirmation: false,
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
        eq(lastMinuteInterests.slotId, offer.slotId),
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
    .where(eq(slots.id, offer.slotId));

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

export async function declineLastMinuteOffer(offerToken: string) {
  const db = getDb();
  const offer = await getOfferedInterestByToken(offerToken);
  if (!offer) {
    throw new Error("No active offer found for this slot");
  }

  let slot = await db.query.slots.findFirst({
    where: eq(slots.id, offer.slotId),
  });
  if (!slot || slot.status !== "available") {
    throw new Error("This slot is no longer available");
  }

  await clearExpiredSlotHolds(slot.trainerId);
  slot =
    (await db.query.slots.findFirst({ where: eq(slots.id, offer.slotId) })) ??
    slot;

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, offer.clientId),
  });
  if (!client) throw new Error("Client not found");

  const now = nowIso();
  if (
    slot.heldForClientId !== offer.clientId ||
    !slot.holdExpiresAt ||
    slot.holdExpiresAt < now
  ) {
    throw new Error(
      "This offer is no longer active. Please contact your trainer.",
    );
  }

  await db
    .update(lastMinuteInterests)
    .set({ status: "declined" })
    .where(eq(lastMinuteInterests.id, offer.id));

  await db
    .update(slots)
    .set({ heldForClientId: null, holdExpiresAt: null })
    .where(eq(slots.id, offer.slotId));

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
