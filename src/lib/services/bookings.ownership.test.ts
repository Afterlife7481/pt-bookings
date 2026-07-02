import { describe, expect, it } from "vitest";
import {
  cancelBookingForTrainer,
  createBookingForSlot,
} from "@/lib/services/bookings";
import { createTrainer } from "@/lib/services/trainers";
import { createClient } from "@/lib/services/clients";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";

/**
 * SEC-2 regression: a trainer must not be able to act on another trainer's
 * slots, clients, or bookings by supplying their ids.
 */
describe("booking ownership (SEC-2)", () => {
  it("rejects allocating another trainer's slot", async () => {
    const fixtures = await seedTestFixtures();
    const otherTrainerId = await createTrainer("Other Trainer", "other@example.com");
    const otherClientId = await createClient({
      trainerId: otherTrainerId,
      name: "Other Client",
      phone: "+447700902001",
    });

    await expect(
      createBookingForSlot({
        slotId: fixtures.slotId,
        clientId: otherClientId,
        trainerId: otherTrainerId,
        sendConfirmation: false,
      }),
    ).rejects.toThrow("Slot is not available");
  });

  it("rejects allocating one trainer's slot to another trainer's client", async () => {
    const fixtures = await seedTestFixtures();
    const otherTrainerId = await createTrainer("Other Trainer", "other@example.com");
    const otherClientId = await createClient({
      trainerId: otherTrainerId,
      name: "Other Client",
      phone: "+447700902002",
    });

    await expect(
      createBookingForSlot({
        slotId: fixtures.slotId,
        clientId: otherClientId,
        trainerId: DEFAULT_TRAINER_ID,
        sendConfirmation: false,
      }),
    ).rejects.toThrow("Client not found");
  });

  it("rejects canceling another trainer's booking", async () => {
    const fixtures = await seedTestFixtures();
    const otherTrainerId = await createTrainer("Other Trainer", "other@example.com");

    const { bookingId } = await createBookingForSlot({
      slotId: fixtures.slotId,
      clientId: fixtures.clientId,
      trainerId: DEFAULT_TRAINER_ID,
      sendConfirmation: false,
    });

    await expect(
      cancelBookingForTrainer(otherTrainerId, bookingId),
    ).rejects.toThrow("Booking not found");
  });
});
