import { describe, expect, it } from "vitest";
import {
  createTrainerSession,
  getTrainerIdFromSessionToken,
} from "@/lib/services/auth";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID, addMinutes, nowIso } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { trainerSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("getTrainerIdFromSessionToken", () => {
  it("returns the trainer id for a valid session", async () => {
    await seedTestFixtures();
    const session = await createTrainerSession(DEFAULT_TRAINER_ID);

    const trainerId = await getTrainerIdFromSessionToken(session.token);
    expect(trainerId).toBe(DEFAULT_TRAINER_ID);
  });

  it("returns null for an expired session", async () => {
    await seedTestFixtures();
    const session = await createTrainerSession(DEFAULT_TRAINER_ID);
    const db = getDb();

    await db
      .update(trainerSessions)
      .set({ expiresAt: addMinutes(nowIso(), -1) })
      .where(eq(trainerSessions.token, session.token));

    const trainerId = await getTrainerIdFromSessionToken(session.token);
    expect(trainerId).toBeNull();
  });
});
