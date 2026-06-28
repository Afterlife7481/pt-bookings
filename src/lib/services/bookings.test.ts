import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, clients, slots } from "@/lib/db/schema";
import {
  cancelBookingByToken,
  createBookingForSlot,
} from "@/lib/services/bookings";
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
