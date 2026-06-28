import fs from "fs";
import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { wipeDatabase, seedFresh } from "@/lib/db/seed";
import { resetDbConnection } from "@/lib/db/index";
import { resetEnsureDb } from "@/lib/db/init";
import { runMigrations } from "@/lib/db/migrate";
import {
  DEFAULT_TRAINER_ID,
  addDays,
  formatDate,
  parseDateOnly,
  startOfWeekMonday,
} from "@/lib/constants";
import { clients } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { createLocation, setClientLocations } from "@/lib/services/locations";
import { addScheduleSlot } from "@/lib/services/schedule";
import { createTrainerSession } from "@/lib/services/auth";
import { WEEK_DAYS } from "@/lib/schedule-grid";

export type TestFixtures = {
  trainerEmail: string;
  clientId: string;
  clientName: string;
  locationId: string;
  locationName: string;
  slotId: string;
  weekStart: string;
  slotDayOfWeek: number;
  slotDayLabel: string;
  sessionToken?: string;
};

let testDbPath: string | null = null;

export function getTestDbPath() {
  if (!testDbPath) {
    testDbPath = path.join(
      os.tmpdir(),
      `pt-bookings-test-${process.pid}-${Date.now()}.db`,
    );
  }
  return testDbPath;
}

function prepareDatabase(useIsolatedTestDb: boolean) {
  if (useIsolatedTestDb) {
    process.env.PT_BOOKINGS_DB_PATH = getTestDbPath();
  }

  resetDbConnection();
  resetEnsureDb();
  wipeDatabase();
  runMigrations();
}

async function seedWithSlot(daysAhead: number): Promise<TestFixtures> {
  const seeded = await seedFresh();
  const db = getDb();

  const firstClient = await db.query.clients.findFirst({
    where: eq(clients.trainerId, DEFAULT_TRAINER_ID),
  });
  if (!firstClient) {
    throw new Error("Expected seeded client");
  }

  const location = await createLocation(DEFAULT_TRAINER_ID, {
    name: "Test Gym",
  });

  await setClientLocations(DEFAULT_TRAINER_ID, firstClient.id, [location.id]);

  const target = addDays(new Date(), daysAhead);
  target.setHours(10, 0, 0, 0);
  const weekStart = formatDate(startOfWeekMonday(target));
  const dayOfWeek = target.getDay();
  const startTime = "10:00";

  const { slotId } = await addScheduleSlot(
    DEFAULT_TRAINER_ID,
    weekStart,
    dayOfWeek,
    startTime,
    location.id,
  );

  const slotDayLabel =
    WEEK_DAYS.find((day) => day.value === dayOfWeek)?.label ?? "Mon";

  return {
    trainerEmail: seeded.trainerEmail,
    clientId: firstClient.id,
    clientName: firstClient.name,
    locationId: location.id,
    locationName: location.name,
    slotId,
    weekStart,
    slotDayOfWeek: dayOfWeek,
    slotDayLabel,
  };
}

export async function seedTestFixtures(): Promise<TestFixtures> {
  prepareDatabase(true);
  return seedWithSlot(7);
}

export async function seedE2eFixtures(): Promise<TestFixtures> {
  prepareDatabase(false);

  const now = new Date();
  const weekStart = formatDate(startOfWeekMonday(now));
  let target = addDays(now, 1);
  target.setHours(10, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target = addDays(now, 2);
    target.setHours(10, 0, 0, 0);
  }

  const weekEnd = addDays(parseDateOnly(weekStart), 6);
  if (target > weekEnd) {
    target = weekEnd;
    target.setHours(10, 0, 0, 0);
  }

  const seeded = await seedFresh();
  const db = getDb();

  const firstClient = await db.query.clients.findFirst({
    where: eq(clients.trainerId, DEFAULT_TRAINER_ID),
  });
  if (!firstClient) {
    throw new Error("Expected seeded client");
  }

  const location = await createLocation(DEFAULT_TRAINER_ID, {
    name: "Test Gym",
  });

  await setClientLocations(DEFAULT_TRAINER_ID, firstClient.id, [location.id]);

  const weekStartForSlot = formatDate(startOfWeekMonday(target));
  const dayOfWeek = target.getDay();
  const { slotId } = await addScheduleSlot(
    DEFAULT_TRAINER_ID,
    weekStartForSlot,
    dayOfWeek,
    "10:00",
    location.id,
  );

  const slotDayLabel =
    WEEK_DAYS.find((day) => day.value === dayOfWeek)?.label ?? "Mon";

  const session = await createTrainerSession(DEFAULT_TRAINER_ID);

  return {
    trainerEmail: seeded.trainerEmail,
    clientId: firstClient.id,
    clientName: firstClient.name,
    locationId: location.id,
    locationName: location.name,
    slotId,
    weekStart,
    slotDayOfWeek: dayOfWeek,
    slotDayLabel,
    sessionToken: session.token,
  };
}

export function writeE2eFixtures(fixtures: TestFixtures, filePath: string) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        trainerEmail: fixtures.trainerEmail,
        clientName: fixtures.clientName,
        locationName: fixtures.locationName,
        slotDayLabel: fixtures.slotDayLabel,
        weekStart: fixtures.weekStart,
        sessionToken: fixtures.sessionToken,
      },
      null,
      2,
    ),
  );
}
