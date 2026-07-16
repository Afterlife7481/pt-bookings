import { describe, expect, it } from "vitest";
import {
  createTrainerSession,
  hashTrainerOtp,
  requestTrainerOtp,
  verifyTrainerOtp,
} from "@/lib/services/auth";
import { createSeedInviteCodes } from "@/lib/services/invites";
import { seedTestFixtures } from "@tests/helpers/db";
import { getDb } from "@/lib/db";
import { trainerMagicLinks } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

describe("trainer OTP auth", () => {
  it("hashes codes consistently", () => {
    expect(hashTrainerOtp("123456")).toBe(hashTrainerOtp("123456"));
    expect(hashTrainerOtp("123456")).not.toBe(hashTrainerOtp("654321"));
  });

  it("logs in an existing trainer with a requested OTP", async () => {
    const fixtures = await seedTestFixtures();
    process.env.APP_ENV = "local";

    const requested = await requestTrainerOtp({
      email: fixtures.trainerEmail,
      purpose: "login",
    });
    expect(requested.devCode).toMatch(/^\d{6}$/);

    const trainerId = await verifyTrainerOtp({
      email: fixtures.trainerEmail,
      code: requested.devCode!,
    });
    expect(trainerId).toBeTruthy();

    const session = await createTrainerSession(trainerId);
    expect(session.token).toBeTruthy();
  });

  it("signs up with invite + OTP and rejects a reused code", async () => {
    await seedTestFixtures();
    process.env.APP_ENV = "local";
    const [inviteCode] = await createSeedInviteCodes({ count: 1, maxUses: 3 });

    const requested = await requestTrainerOtp({
      email: "otp-signup@example.com",
      name: "OTP Signup",
      purpose: "signup",
      inviteCode,
    });
    expect(requested.devCode).toMatch(/^\d{6}$/);

    const trainerId = await verifyTrainerOtp({
      email: "otp-signup@example.com",
      code: requested.devCode!,
    });
    expect(trainerId).toBeTruthy();

    await expect(
      verifyTrainerOtp({
        email: "otp-signup@example.com",
        code: requested.devCode!,
      }),
    ).rejects.toThrow(/invalid or has expired/i);
  });

  it("locks out after too many incorrect attempts", async () => {
    const fixtures = await seedTestFixtures();
    process.env.APP_ENV = "local";

    await requestTrainerOtp({
      email: fixtures.trainerEmail,
      purpose: "login",
    });

    for (let i = 0; i < 5; i += 1) {
      await expect(
        verifyTrainerOtp({
          email: fixtures.trainerEmail,
          code: "000000",
        }),
      ).rejects.toThrow(/incorrect|Too many/i);
    }

    const challenge = await getDb().query.trainerMagicLinks.findFirst({
      where: and(
        eq(trainerMagicLinks.email, fixtures.trainerEmail),
        isNull(trainerMagicLinks.usedAt),
      ),
    });
    // Fifth failure invalidates the challenge.
    expect(challenge).toBeUndefined();
  });
});
