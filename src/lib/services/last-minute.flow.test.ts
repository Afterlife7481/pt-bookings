import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  bookings,
  lastMinuteInterests,
  slots,
  whatsappMessages,
  clients,
} from "@/lib/db/schema";
import {
  cancelBookingForTrainer,
  createBookingForSlot,
  getBookingByToken,
  listClientSessions,
} from "@/lib/services/bookings";
import { startChangeRequest } from "@/lib/services/change";
import {
  acceptLastMinuteOffer,
  declineLastMinuteOffer,
  sendLastMinuteOffer,
  setClientLastMinutePreferences,
} from "@/lib/services/last-minute";
import { addScheduleSlot } from "@/lib/services/schedule";
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
    expect(interest?.token).toBe(offer.offerToken);
    expect(interest?.token).toBeTruthy();

    const messages = await db.query.whatsappMessages.findMany({
      where: eq(whatsappMessages.trainerId, DEFAULT_TRAINER_ID),
    });
    expect(messages.some((m) => m.messageType === "last_minute")).toBe(true);
    expect(
      messages.some((m) => m.body.includes(`/interest/${offer.offerToken}`)),
    ).toBe(true);

    await expect(
      acceptLastMinuteOffer("not-a-real-offer-token"),
    ).rejects.toThrow(/No active offer/);

    const result = await acceptLastMinuteOffer(offer.offerToken);

    expect(result.booking.bookingId).toBeTruthy();
    expect(result.booking.token).toBeTruthy();

    const acceptedBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, result.booking.bookingId),
    });
    expect(acceptedBooking?.status).toBe("booked");

    const sessionView = await getBookingByToken(result.booking.token);
    expect(sessionView?.booking.status).toBe("booked");

    const { upcoming } = await listClientSessions(fixtures.clientId);
    const listed = upcoming.find(
      (session) => session.bookingToken === result.booking.token,
    );
    expect(listed?.status).toBe("booked");

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

    const offer = await sendLastMinuteOffer(
      DEFAULT_TRAINER_ID,
      fixtures.slotId,
      fixtures.clientId,
    );

    const result = await declineLastMinuteOffer(offer.offerToken);

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

  it("rejects a second offer to another client while the hold is active", async () => {
    const fixtures = await seedTestFixtures();
    await prepareClientForLastMinute(fixtures);

    const db = getDb();
    const others = await db.query.clients.findMany({
      where: eq(clients.trainerId, DEFAULT_TRAINER_ID),
    });
    const other =
      others.find((c) => c.id !== fixtures.clientId && c.lastMinuteOptIn) ??
      others.find((c) => c.id !== fixtures.clientId);
    expect(other).toBeTruthy();

    await db
      .update(clients)
      .set({ lastMinuteOptIn: true })
      .where(eq(clients.id, other!.id));
    await setClientLastMinutePreferences(other!.id, DEFAULT_TRAINER_ID, [
      { dayOfWeek: fixtures.slotDayOfWeek, startTime: "10:00" },
    ]);

    await sendLastMinuteOffer(
      DEFAULT_TRAINER_ID,
      fixtures.slotId,
      fixtures.clientId,
    );

    await expect(
      sendLastMinuteOffer(DEFAULT_TRAINER_ID, fixtures.slotId, other!.id),
    ).rejects.toThrow(/already held for another client/i);

    const interestRows = await db.query.lastMinuteInterests.findMany({
      where: eq(lastMinuteInterests.slotId, fixtures.slotId),
    });
    expect(interestRows.every((row) => row.status !== "superseded")).toBe(true);
    expect(
      interestRows.filter((row) => row.status === "offered"),
    ).toHaveLength(1);
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

  it("books as booked after trainer cancels an open slot and client accepts", async () => {
    const fixtures = await seedTestFixtures();
    await prepareClientForLastMinute(fixtures);

    const { bookingId, token } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    await cancelBookingForTrainer(DEFAULT_TRAINER_ID, bookingId);

    await sendLastMinuteOffer(
      DEFAULT_TRAINER_ID,
      fixtures.slotId,
      fixtures.clientId,
    );

    const result = await acceptLastMinuteOffer(
      fixtures.slotId,
      fixtures.clientId,
    );

    const db = getDb();
    const acceptedBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, result.booking.bookingId),
    });
    expect(acceptedBooking?.status).toBe("booked");
    expect(result.booking.token).not.toBe(token);

    const sessionView = await getBookingByToken(result.booking.token);
    expect(sessionView?.booking.status).toBe("booked");
  });

  it("books as booked when client has another session in pending_change", async () => {
    const fixtures = await seedTestFixtures();
    await prepareClientForLastMinute(fixtures);

    const { slotId: otherSlotId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      fixtures.weekStart,
      fixtures.slotDayOfWeek,
      "11:00",
      fixtures.locationId,
    );

    const { token: changingToken } = await createBookingForSlot({
      slotId: otherSlotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    await startChangeRequest(changingToken);

    await sendLastMinuteOffer(
      DEFAULT_TRAINER_ID,
      fixtures.slotId,
      fixtures.clientId,
    );

    const result = await acceptLastMinuteOffer(
      fixtures.slotId,
      fixtures.clientId,
    );

    const db = getDb();
    const acceptedBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, result.booking.bookingId),
    });
    expect(acceptedBooking?.status).toBe("booked");

    const sessionView = await getBookingByToken(result.booking.token);
    expect(sessionView?.booking.status).toBe("booked");
  });
});
