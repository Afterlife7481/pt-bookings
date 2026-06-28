import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { bookings, slots } from "@/lib/db/schema";
import { createBookingForSlot } from "@/lib/services/bookings";
import { confirmChange, startChangeRequest } from "@/lib/services/change";
import { addScheduleSlot } from "@/lib/services/schedule";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";

describe("confirmChange", () => {
  it("moves a booking to a new slot atomically", async () => {
    const fixtures = await seedTestFixtures();

    const { slotId: toSlotId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      fixtures.weekStart,
      fixtures.slotDayOfWeek,
      "11:00",
      fixtures.locationId,
    );

    const { token } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    const start = await startChangeRequest(token);
    expect(start.changeRequestId).toBeTruthy();
    if (!start.changeRequestId) {
      throw new Error("Expected active change request");
    }

    await confirmChange(start.changeRequestId, toSlotId);

    const db = getDb();
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.token, token),
    });
    expect(booking?.slotId).toBe(toSlotId);
    expect(booking?.status).toBe("confirmed");

    const fromSlot = await db.query.slots.findFirst({
      where: eq(slots.id, fixtures.slotId),
    });
    const toSlot = await db.query.slots.findFirst({
      where: eq(slots.id, toSlotId),
    });
    expect(fromSlot?.status).toBe("available");
    expect(toSlot?.status).toBe("booked");
  });

  it("rejects confirming onto an already booked slot", async () => {
    const fixtures = await seedTestFixtures();
    const db = getDb();
    const allClients = await db.query.clients.findMany();
    const secondClient = allClients.find((c) => c.id !== fixtures.clientId);
    if (!secondClient) {
      throw new Error("Expected a second seeded client");
    }

    const { slotId: bookedTargetId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      fixtures.weekStart,
      fixtures.slotDayOfWeek,
      "11:00",
      fixtures.locationId,
    );

    await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      fixtures.weekStart,
      fixtures.slotDayOfWeek,
      "12:00",
      fixtures.locationId,
    );

    const { token } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    await createBookingForSlot({
      slotId: bookedTargetId,
      clientId: secondClient.id,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    const start = await startChangeRequest(token);
    if (!start.changeRequestId) {
      throw new Error("Expected active change request");
    }

    await expect(
      confirmChange(start.changeRequestId, bookedTargetId),
    ).rejects.toThrow(/no longer available/);
  });
});
