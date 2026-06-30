import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, clients, slots, whatsappMessages } from "@/lib/db/schema";
import {
  cancelBookingByToken,
  createBookingForSlot,
  sendConfirmationForBooking,
  sendInvoiceForBooking,
  voidBookingForTrainer,
} from "@/lib/services/bookings";
import { updateTrainerSettings } from "@/lib/services/settings";
import { setClientLocations } from "@/lib/services/locations";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID, toLocalDateTimeString } from "@/lib/constants";

describe("createBookingForSlot", () => {
  it("books an available slot", async () => {
    const fixtures = await seedTestFixtures();

    const result = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    expect(result.bookingId).toBeTruthy();
    expect(result.token).toBeTruthy();

    const db = getDb();
    const slot = await db.query.slots.findFirst({
      where: eq(slots.id, fixtures.slotId),
    });
    expect(slot?.status).toBe("booked");
  });

  it("rejects a second booking on the same slot", async () => {
    const fixtures = await seedTestFixtures();
    const db = getDb();

    const otherClients = await db.query.clients.findMany({
      where: eq(clients.trainerId, DEFAULT_TRAINER_ID),
    });
    const secondClient = otherClients.find((c) => c.id !== fixtures.clientId);
    if (!secondClient) {
      throw new Error("Expected a second seeded client");
    }

    await setClientLocations(DEFAULT_TRAINER_ID, secondClient.id, [
      fixtures.locationId,
    ]);

    await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    await expect(
      createBookingForSlot({
        slotId: fixtures.slotId,
        clientId: secondClient.id,
        trainerId: DEFAULT_TRAINER_ID,
        sendConfirmation: false,
      }),
    ).rejects.toThrow("Slot is not available");
  });

  it("allows only one concurrent booking when raced", async () => {
    const fixtures = await seedTestFixtures();
    const db = getDb();
    const allClients = await db.query.clients.findMany();
    const secondClient = allClients.find((c) => c.id !== fixtures.clientId);
    if (!secondClient) {
      throw new Error("Expected a second seeded client");
    }

    await setClientLocations(DEFAULT_TRAINER_ID, secondClient.id, [
      fixtures.locationId,
    ]);

    const attempts = await Promise.allSettled([
      createBookingForSlot({
        slotId: fixtures.slotId,
        clientId: fixtures.clientId,
        trainerId: DEFAULT_TRAINER_ID,
        sendConfirmation: false,
      }),
      createBookingForSlot({
        slotId: fixtures.slotId,
        clientId: secondClient.id,
        trainerId: DEFAULT_TRAINER_ID,
        sendConfirmation: false,
      }),
    ]);

    const fulfilled = attempts.filter((a) => a.status === "fulfilled");
    const rejected = attempts.filter((a) => a.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  it("rejects booking when the client has no enabled locations", async () => {
    const fixtures = await seedTestFixtures();
    const db = getDb();
    const otherClients = await db.query.clients.findMany({
      where: eq(clients.trainerId, DEFAULT_TRAINER_ID),
    });
    const clientWithoutLocations = otherClients.find(
      (c) => c.id !== fixtures.clientId,
    );
    if (!clientWithoutLocations) {
      throw new Error("Expected a second seeded client");
    }

    await expect(
      createBookingForSlot({
        slotId: fixtures.slotId,
        clientId: clientWithoutLocations.id,
        trainerId: DEFAULT_TRAINER_ID,
        sendConfirmation: false,
        locationValidation: "trainer",
      }),
    ).rejects.toThrow("no locations enabled");
  });
});

describe("cancelBookingByToken", () => {
  it("cancels a booking outside the deadline window", async () => {
    const fixtures = await seedTestFixtures();
    const { token } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    const result = await cancelBookingByToken(token);
    expect(result.clientHomeToken).toBeTruthy();

    const db = getDb();
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.token, token),
    });
    expect(booking?.status).toBe("canceled");

    const messages = await db.query.whatsappMessages.findMany({
      where: eq(whatsappMessages.trainerId, DEFAULT_TRAINER_ID),
    });
    expect(
      messages.some(
        (m) => m.messageType === "session_canceled" && m.recipient === "trainer",
      ),
    ).toBe(true);
  });

  it("blocks cancellation inside the deadline window", async () => {
    const fixtures = await seedTestFixtures();
    const db = getDb();

    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const soonStart = toLocalDateTimeString(soon);
    await db
      .update(slots)
      .set({ startAt: soonStart })
      .where(eq(slots.id, fixtures.slotId));

    const { token } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    await expect(cancelBookingByToken(token)).rejects.toThrow(
      /Cancellations are not allowed/,
    );
  });
});

describe("sendConfirmationForBooking", () => {
  it("records confirmationSentAt when booking a slot with confirmation", async () => {
    const fixtures = await seedTestFixtures();

    const { bookingId } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: true,
    });

    const db = getDb();
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });
    expect(booking?.confirmationSentAt).toBeTruthy();
  });

  it("records confirmationSentAt when sent manually", async () => {
    const fixtures = await seedTestFixtures();

    const { bookingId } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    const detail = await sendConfirmationForBooking(bookingId);
    expect(detail?.booking.confirmationSentAt).toBeTruthy();
  });
});

describe("voidBookingForTrainer", () => {
  it("voids a past session", async () => {
    const fixtures = await seedTestFixtures();
    const db = getDb();

    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db
      .update(slots)
      .set({ startAt: toLocalDateTimeString(past) })
      .where(eq(slots.id, fixtures.slotId));

    const { bookingId } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    const detail = await voidBookingForTrainer(DEFAULT_TRAINER_ID, bookingId);
    expect(detail?.booking.status).toBe("voided");
  });

  it("rejects voiding an upcoming session", async () => {
    const fixtures = await seedTestFixtures();
    const { bookingId } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    await expect(
      voidBookingForTrainer(DEFAULT_TRAINER_ID, bookingId),
    ).rejects.toThrow(/Only past sessions can be voided/);
  });
});

describe("sendInvoiceForBooking", () => {
  it("records invoiceSentAt when price and bank details are set", async () => {
    const fixtures = await seedTestFixtures();
    const db = getDb();

    await updateTrainerSettings(DEFAULT_TRAINER_ID, {
      bankAccountNumber: "12345678",
      bankSortCode: "12-34-56",
    });
    await db
      .update(clients)
      .set({ sessionPrice: 5000 })
      .where(eq(clients.id, fixtures.clientId));

    const { bookingId } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    const detail = await sendInvoiceForBooking(bookingId);
    expect(detail?.booking.invoiceSentAt).toBeTruthy();
  });

  it("rejects invoices for voided sessions", async () => {
    const fixtures = await seedTestFixtures();
    const db = getDb();

    await updateTrainerSettings(DEFAULT_TRAINER_ID, {
      bankAccountNumber: "12345678",
      bankSortCode: "12-34-56",
    });
    await db
      .update(clients)
      .set({ sessionPrice: 5000 })
      .where(eq(clients.id, fixtures.clientId));

    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db
      .update(slots)
      .set({ startAt: toLocalDateTimeString(past) })
      .where(eq(slots.id, fixtures.slotId));

    const { bookingId } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    await voidBookingForTrainer(DEFAULT_TRAINER_ID, bookingId);

    await expect(sendInvoiceForBooking(bookingId)).rejects.toThrow(
      /Cannot send invoice for a canceled or voided session/,
    );
  });
});
