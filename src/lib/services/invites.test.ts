import { describe, expect, it } from "vitest";
import {
  assertInviteCodeAvailable,
  createSeedInviteCodes,
  createTrainerWithInvite,
  ensureTrainerInviteCode,
  formatInviteCode,
  getTrainerInvitations,
  normalizeInviteCode,
} from "@/lib/services/invites";
import { seedTestFixtures } from "@tests/helpers/db";
import { DEFAULT_TRAINER_ID } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { inviteCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

describe("invite codes", () => {
  it("normalizes and formats codes", () => {
    expect(normalizeInviteCode("ab cd-12")).toBe("ABCD12");
    expect(formatInviteCode("ABCD1234")).toBe("ABCD-1234");
  });

  it("creates accounts by redeeming a seed code and issues a personal code", async () => {
    await seedTestFixtures();
    const [seedCode] = await createSeedInviteCodes({ count: 1, maxUses: 2 });

    await assertInviteCodeAvailable(seedCode);

    const trainerId = await createTrainerWithInvite({
      name: "Blake Invitee",
      email: "blake@example.com",
      inviteCode: seedCode,
    });

    const inviteeView = await getTrainerInvitations(trainerId);
    expect(inviteeView.usedCount).toBe(0);
    expect(inviteeView.maxUses).toBe(3);
    expect(inviteeView.code).toHaveLength(8);

    const seed = await getDb().query.inviteCodes.findFirst({
      where: eq(inviteCodes.code, seedCode),
    });
    expect(seed?.usedCount).toBe(1);

    await createTrainerWithInvite({
      name: "Casey Invitee",
      email: "casey@example.com",
      inviteCode: seedCode,
    });

    await expect(assertInviteCodeAvailable(seedCode)).rejects.toThrow(
      /signup limit/i,
    );
  });

  it("issues one permanent code per trainer", async () => {
    await seedTestFixtures();
    const first = await ensureTrainerInviteCode(DEFAULT_TRAINER_ID);
    const second = await ensureTrainerInviteCode(DEFAULT_TRAINER_ID);
    expect(first).toBe(second);

    const view = await getTrainerInvitations(DEFAULT_TRAINER_ID);
    expect(view.displayCode).toBe(formatInviteCode(first));
    expect(view.signups).toEqual([]);
  });

  it("rejects invalid codes", async () => {
    await seedTestFixtures();
    await expect(assertInviteCodeAvailable("NOPE1234")).rejects.toThrow(
      /invalid/i,
    );
  });

  it("lists signups against the inviter's code", async () => {
    await seedTestFixtures();
    const inviterCode = await ensureTrainerInviteCode(DEFAULT_TRAINER_ID);

    await createTrainerWithInvite({
      name: "Drew Invitee",
      email: "drew@example.com",
      inviteCode: inviterCode,
    });

    const view = await getTrainerInvitations(DEFAULT_TRAINER_ID);
    expect(view.usedCount).toBe(1);
    expect(view.signups.map((s) => s.name)).toEqual(["Drew Invitee"]);
  });
});
