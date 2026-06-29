import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { recurringPreferences } from "@/lib/db/schema";
import { setRecurringPreferences } from "@/lib/services/clients";
import { createLocation, setClientLocations } from "@/lib/services/locations";
import { saveTrainerTemplate } from "@/lib/services/templates";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";

describe("setRecurringPreferences", () => {
  it("rejects recurring slots whose location differs from the template", async () => {
    const fixtures = await seedTestFixtures();
    const db = getDb();

    const otherLocation = await createLocation(DEFAULT_TRAINER_ID, {
      name: "Other Gym",
    });

    await saveTrainerTemplate(DEFAULT_TRAINER_ID, [
      {
        dayOfWeek: fixtures.slotDayOfWeek,
        startTime: "10:00",
        endTime: "11:00",
        locationId: fixtures.locationId,
      },
    ]);

    await setClientLocations(DEFAULT_TRAINER_ID, fixtures.clientId, [
      fixtures.locationId,
      otherLocation.id,
    ]);

    await expect(
      setRecurringPreferences(fixtures.clientId, DEFAULT_TRAINER_ID, [
        {
          dayOfWeek: fixtures.slotDayOfWeek,
          startTime: "10:00",
          locationId: otherLocation.id,
        },
      ]),
    ).rejects.toThrow(/must match the weekly template/i);

    const prefs = await db.query.recurringPreferences.findMany({
      where: eq(recurringPreferences.clientId, fixtures.clientId),
    });
    expect(prefs).toHaveLength(0);
  });

  it("saves recurring slots when location matches the template and client", async () => {
    const fixtures = await seedTestFixtures();

    await saveTrainerTemplate(DEFAULT_TRAINER_ID, [
      {
        dayOfWeek: fixtures.slotDayOfWeek,
        startTime: "10:00",
        endTime: "11:00",
        locationId: fixtures.locationId,
      },
    ]);

    await setRecurringPreferences(fixtures.clientId, DEFAULT_TRAINER_ID, [
      {
        dayOfWeek: fixtures.slotDayOfWeek,
        startTime: "10:00",
        locationId: fixtures.locationId,
      },
    ]);

    const db = getDb();
    const prefs = await db.query.recurringPreferences.findMany({
      where: eq(recurringPreferences.clientId, fixtures.clientId),
    });
    expect(prefs).toHaveLength(1);
    expect(prefs[0]?.locationId).toBe(fixtures.locationId);
  });
});
