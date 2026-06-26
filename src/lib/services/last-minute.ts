import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  lastMinuteInterests,
  slots,
} from "@/lib/db/schema";
import { nowIso } from "@/lib/constants";
import { sendWhatsAppInterestAck } from "@/lib/whatsapp";
import { createBookingForSlot } from "./bookings";

export async function expressInterest(slotId: string, clientId: string) {
  const db = getDb();

  const slot = await db.query.slots.findFirst({ where: eq(slots.id, slotId) });
  if (!slot || slot.status !== "available") {
    throw new Error("This slot is no longer available");
  }

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });
  if (!client) throw new Error("Client not found");

  const existing = await db.query.lastMinuteInterests.findFirst({
    where: and(
      eq(lastMinuteInterests.slotId, slotId),
      eq(lastMinuteInterests.clientId, clientId),
    ),
  });

  if (existing) {
    return { alreadyRegistered: true, interest: existing, client, slot };
  }

  const interestId = nanoid();
  const token = nanoid(12);

  await db.insert(lastMinuteInterests).values({
    id: interestId,
    trainerId: slot.trainerId,
    slotId,
    clientId,
    status: "interested",
    token,
    createdAt: nowIso(),
  });

  await sendWhatsAppInterestAck({
    trainerId: slot.trainerId,
    clientId: client.id,
    phone: client.phone,
    slotStartAt: slot.startAt,
    clientName: client.name,
  });

  const interest = await db.query.lastMinuteInterests.findFirst({
    where: eq(lastMinuteInterests.id, interestId),
  });

  return { alreadyRegistered: false, interest, client, slot };
}

export async function listOpenLastMinuteSlots(trainerId: string) {
  const db = getDb();
  const openSlots = await db
    .select()
    .from(slots)
    .where(and(eq(slots.trainerId, trainerId), eq(slots.status, "available")));

  const results = [];
  for (const slot of openSlots) {
    const interests = await db
      .select({
        interest: lastMinuteInterests,
        client: clients,
      })
      .from(lastMinuteInterests)
      .innerJoin(clients, eq(lastMinuteInterests.clientId, clients.id))
      .where(
        and(
          eq(lastMinuteInterests.slotId, slot.id),
          eq(lastMinuteInterests.status, "interested"),
        ),
      );

    if (interests.length > 0) {
      results.push({ slot, interests });
    }
  }

  return results;
}

export async function assignLastMinuteSlot(
  slotId: string,
  clientId: string,
  trainerId: string,
) {
  const db = getDb();

  await createBookingForSlot({
    slotId,
    clientId,
    trainerId,
    sendConfirmation: true,
  });

  const interests = await db
    .select()
    .from(lastMinuteInterests)
    .where(eq(lastMinuteInterests.slotId, slotId));

  for (const interest of interests) {
    await db
      .update(lastMinuteInterests)
      .set({
        status:
          interest.clientId === clientId ? "assigned" : "not_selected",
      })
      .where(eq(lastMinuteInterests.id, interest.id));
  }
}
