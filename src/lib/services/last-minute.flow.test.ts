import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { lastMinuteInterests, slots, whatsappMessages, clients } from "@/lib/db/schema";
import {
  acceptLastMinuteOffer,
  declineLastMinuteOffer,
  sendLastMinuteOffer,
  setClientLastMinutePreferences,
} from "@/lib/services/last-minute";
import { saveTrainerTemplate } from "@/lib/services/templates";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";

describe("last-minute offer flow", () => {
  async function prepareClientForLastMinute(fixtures: Awaited<
    ReturnType<typeof seedTestFixtures>
  >) {
    await saveTrainerTemplate(DEFAULT_TRAINER_ID, [
      {
        dayOfWeek: fixtures.slotDayOfWeek,
        startTime: "10:00",
        endTime: "11:00",
        locationId: fixtures.locationId,
      },
    ]);

    await setClientLastMinutePreferences(fixtures.clientId, DEFAULT_TRAINER_ID, [
      { dayOfWeek: fixtures.slotDayOfWeek, startTime: "10:00" },
    ]);
  }

  it("sends an offer, logs WhatsApp, and accepts into a booking", async () => {
    const fixtures = await seedTestFixtures();
    await prepareClientForLastMinute(fixtures);

    const offer = await sendLastMinuteOffer(
      DEFAULT_TRAINER_ID,
      fixtures.slotId,
      fixtures.clientId,
    );

    expect(offer.expiresAt).toBeTruthy();
    expect(offer.lockHours).toBeGreaterThan(0);

    const db = getDb();
    const slotAfterOffer = await db.query.slots.findFirst({
      where: eq(slots.id, fixtures.slotId),
    });
    expect(slotAfterOffer?.heldForClientId).toBe(fixtures.clientId);
    expect(slotAfterOffer?.holdExpiresAt).toBeTruthy();

    const interest = await db.query.lastMinuteInterests.findFirst({
      where: eq(lastMinuteInterests.slotId, fixtures.slotId),
    });
    expect(interest?.status).toBe("offered");

    const messages = await db.query.whatsappMessages.findMany({
      where: eq(whatsappMessages.trainerId, DEFAULT_TRAINER_ID),
    });
    expect(messages.some((m) => m.messageType === "last_minute")).toBe(true);

    const result = await acceptLastMinuteOffer(
      fixtures.slotId,
      fixtures.clientId,
    );

    expect(result.booking.bookingId).toBeTruthy();

    const slotAfterAccept = await db.query.slots.findFirst({
      where: eq(slots.id, fixtures.slotId),
    });
    expect(slotAfterAccept?.status).toBe("booked");
    expect(slotAfterAccept?.heldForClientId).toBeNull();

    const acceptedInterest = await db.query.lastMinuteInterests.findFirst({
      where: eq(lastMinuteInterests.id, interest!.id),
    });
    expect(acceptedInterest?.status).toBe("accepted");

    const messagesAfterAccept = await db.query.whatsappMessages.findMany({
      where: eq(whatsappMessages.trainerId, DEFAULT_TRAINER_ID),
    });
    expect(
      messagesAfterAccept.some(
        (m) =>
          m.messageType === "last_minute_accepted" && m.recipient === "trainer",
      ),
    ).toBe(true);
  });

  it("declines an offer, releases the slot, and notifies the trainer", async () => {
    const fixtures = await seedTestFixtures();
    await prepareClientForLastMinute(fixtures);

    await sendLastMinuteOffer(
      DEFAULT_TRAINER_ID,
      fixtures.slotId,
      fixtures.clientId,
    );

    const result = await declineLastMinuteOffer(
      fixtures.slotId,
      fixtures.clientId,
    );

    expect(result.client.id).toBe(fixtures.clientId);

    const db = getDb();
    const slotAfterDecline = await db.query.slots.findFirst({
      where: eq(slots.id, fixtures.slotId),
    });
    expect(slotAfterDecline?.status).toBe("available");
    expect(slotAfterDecline?.heldForClientId).toBeNull();
    expect(slotAfterDecline?.holdExpiresAt).toBeNull();

    const interest = await db.query.lastMinuteInterests.findFirst({
      where: eq(lastMinuteInterests.slotId, fixtures.slotId),
    });
    expect(interest?.status).toBe("declined");

    const messages = await db.query.whatsappMessages.findMany({
      where: eq(whatsappMessages.trainerId, DEFAULT_TRAINER_ID),
    });
    expect(
      messages.some(
        (m) =>
          m.messageType === "last_minute_declined" && m.recipient === "trainer",
      ),
    ).toBe(true);
  });

  it("rejects sending offers for past slots", async () => {
    const fixtures = await seedTestFixtures();
    await prepareClientForLastMinute(fixtures);

    const db = getDb();
    await db
      .update(slots)
      .set({
        startAt: "2020-01-01T10:00:00",
        endAt: "2020-01-01T11:00:00",
      })
      .where(eq(slots.id, fixtures.slotId));

    await expect(
      sendLastMinuteOffer(
        DEFAULT_TRAINER_ID,
        fixtures.slotId,
        fixtures.clientId,
      ),
    ).rejects.toThrow("Cannot send offers for past slots");
  });

  it("rejects sending when the client is not opted in", async () => {
    const fixtures = await seedTestFixtures();
    await prepareClientForLastMinute(fixtures);

    const db = getDb();
    await db
      .update(clients)
      .set({ lastMinuteOptIn: false })
      .where(eq(clients.id, fixtures.clientId));

    await expect(
      sendLastMinuteOffer(
        DEFAULT_TRAINER_ID,
        fixtures.slotId,
        fixtures.clientId,
      ),
    ).rejects.toThrow("Client is not opted in to last-minute alerts");
  });
});
