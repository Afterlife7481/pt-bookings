import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { clients, trainers } from "@/lib/db/schema";
import {
  deleteTrainerAccount,
  isProtectedTrainerEmail,
} from "@/lib/services/account-deletion";
import { createTrainer, getTrainerByEmail } from "@/lib/services/trainers";
import { createClient } from "@/lib/services/clients";

describe("deleteTrainerAccount", () => {
  it("blocks deletion of the protected demo account", async () => {
    await seedTestFixtures();

    await expect(
      deleteTrainerAccount(DEFAULT_TRAINER_ID, "alex@example.com"),
    ).rejects.toThrow("This account cannot be deleted.");
  });

  it("requires the confirmation email to match", async () => {
    const trainerId = await createTrainer("Sam", "sam@example.com");

    await expect(
      deleteTrainerAccount(trainerId, "wrong@example.com"),
    ).rejects.toThrow("Email address does not match your account.");
  });

  it("removes the trainer and all related data", async () => {
    const trainerId = await createTrainer("Removable", "removable@example.com");
    await createClient({
      trainerId,
      name: "Client One",
      phone: "+447700901199",
    });

    await deleteTrainerAccount(trainerId, "removable@example.com");

    const db = getDb();
    const trainer = await getTrainerByEmail("removable@example.com");
    expect(trainer).toBeUndefined();

    const remainingClients = await db.query.clients.findMany({
      where: eq(clients.trainerId, trainerId),
    });
    expect(remainingClients).toHaveLength(0);

    const trainerRow = await db.query.trainers.findFirst({
      where: eq(trainers.id, trainerId),
    });
    expect(trainerRow).toBeUndefined();
  });
});

describe("isProtectedTrainerEmail", () => {
  it("protects alex@example.com regardless of casing", () => {
    expect(isProtectedTrainerEmail("alex@example.com")).toBe(true);
    expect(isProtectedTrainerEmail("Alex@Example.com")).toBe(true);
    expect(isProtectedTrainerEmail("sam@example.com")).toBe(false);
  });
});
