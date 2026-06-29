import { describe, expect, it } from "vitest";
import { getAvailableSlotsForChange } from "@/lib/services/templates";
import { updateTrainerSettings } from "@/lib/services/settings";
import { addScheduleSlot } from "@/lib/services/schedule";
import { seedTestFixtures } from "@tests/helpers/db";
import {
  DEFAULT_TRAINER_ID,
  addDays,
  formatDate,
  startOfWeekMonday,
} from "@/lib/constants";

describe("getAvailableSlotsForChange", () => {
  it("respects the trainer client booking window setting", async () => {
    const fixtures = await seedTestFixtures();
    await updateTrainerSettings(DEFAULT_TRAINER_ID, {
      clientBookingWindowWeeks: 1,
    });

    const withinWindow = addDays(new Date(), 3);
    withinWindow.setHours(11, 0, 0, 0);
    const outsideWindow = addDays(new Date(), 10);
    outsideWindow.setHours(11, 0, 0, 0);

    const { slotId: nearSlotId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      formatDate(startOfWeekMonday(withinWindow)),
      withinWindow.getDay(),
      "11:00",
      fixtures.locationId,
    );

    const { slotId: farSlotId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      formatDate(startOfWeekMonday(outsideWindow)),
      outsideWindow.getDay(),
      "11:00",
      fixtures.locationId,
    );

    const available = await getAvailableSlotsForChange(
      DEFAULT_TRAINER_ID,
      undefined,
      undefined,
      fixtures.clientId,
    );

    const ids = available.map((slot) => slot.id);
    expect(ids).toContain(nearSlotId);
    expect(ids).not.toContain(farSlotId);
  });
});
