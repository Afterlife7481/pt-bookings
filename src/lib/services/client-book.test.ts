import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { slots, whatsappMessages } from "@/lib/db/schema";
import { bookSlotByClientToken } from "@/lib/services/bookings";
import { createLocation, setClientLocations } from "@/lib/services/locations";
import { addScheduleSlot } from "@/lib/services/schedule";
import { getAvailableSlotsForChange } from "@/lib/services/templates";
import { updateTrainerSettings } from "@/lib/services/settings";
import { seedTestFixtures } from "@tests/helpers/db";
import {
  DEFAULT_TRAINER_ID,
  addDays,
  formatDate,
  startOfWeekMonday,
} from "@/lib/constants";

describe("bookSlotByClientToken", () => {
  it("books an available slot for the client", async () => {
    const fixtures = await seedTestFixtures();

    const result = await bookSlotByClientToken(
      fixtures.clientToken,
      fixtures.slotId,
    );

    expect(result.bookingId).toBeTruthy();
    expect(result.token).toBeTruthy();

    const db = getDb();
    const slot = await db.query.slots.findFirst({
      where: eq(slots.id, fixtures.slotId),
    });
    expect(slot?.status).toBe("booked");

    const messages = await db.query.whatsappMessages.findMany({
      where: eq(whatsappMessages.trainerId, DEFAULT_TRAINER_ID),
    });
    expect(messages.some((m) => m.messageType === "confirmation")).toBe(true);
  });

  it("rejects an unknown client token", async () => {
    const fixtures = await seedTestFixtures();

    await expect(
      bookSlotByClientToken("invalid-token", fixtures.slotId),
    ).rejects.toThrow("Client not found");
  });

  it("rejects when the client cannot use the slot location", async () => {
    const fixtures = await seedTestFixtures();
    const otherLocation = await createLocation(DEFAULT_TRAINER_ID, {
      name: "Other Gym",
    });

    const target = addDays(new Date(), 8);
    target.setHours(12, 0, 0, 0);
    const { slotId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      formatDate(startOfWeekMonday(target)),
      target.getDay(),
      "12:00",
      otherLocation.id,
    );

    await expect(
      bookSlotByClientToken(fixtures.clientToken, slotId),
    ).rejects.toThrow();
  });

  it("rejects when the slot is outside the calendar booking window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00"));

    try {
      const fixtures = await seedTestFixtures();
      await updateTrainerSettings(DEFAULT_TRAINER_ID, {
        clientBookingWindowWeeks: 1,
      });

      const { slotId } = await addScheduleSlot(
        DEFAULT_TRAINER_ID,
        "2026-07-06",
        2,
        "11:00",
        fixtures.locationId,
      );

      await expect(
        bookSlotByClientToken(fixtures.clientToken, slotId),
      ).rejects.toThrow("This slot is outside your booking window");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("getAvailableSlotsForChange (client book list)", () => {
  it("includes only slots at enabled locations within the booking window", async () => {
    const fixtures = await seedTestFixtures();

    const available = await getAvailableSlotsForChange(
      DEFAULT_TRAINER_ID,
      undefined,
      undefined,
      fixtures.clientId,
    );

    expect(available.some((slot) => slot.id === fixtures.slotId)).toBe(true);

    const disabledLocation = await createLocation(DEFAULT_TRAINER_ID, {
      name: "Disabled Gym",
    });
    const target = addDays(new Date(), 8);
    target.setHours(13, 0, 0, 0);
    const { slotId: disabledSlotId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      formatDate(startOfWeekMonday(target)),
      target.getDay(),
      "13:00",
      disabledLocation.id,
    );

    await setClientLocations(DEFAULT_TRAINER_ID, fixtures.clientId, [
      fixtures.locationId,
    ]);

    const filtered = await getAvailableSlotsForChange(
      DEFAULT_TRAINER_ID,
      undefined,
      undefined,
      fixtures.clientId,
    );

    expect(filtered.some((slot) => slot.id === fixtures.slotId)).toBe(true);
    expect(filtered.some((slot) => slot.id === disabledSlotId)).toBe(false);
  });
});
