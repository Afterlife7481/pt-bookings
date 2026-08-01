import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { loginAsTrainer } from "./helpers/auth";
import {
  allocateOpenSlotToClient,
  openUnallocatedSlot,
  waitForScheduleReady,
} from "./helpers/schedule";

type E2eFixtures = {
  trainerEmail: string;
  clientName: string;
  locationName: string;
};

function loadFixtures(): E2eFixtures {
  const fixturePath = path.join(__dirname, "fixtures.json");
  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as Record<
    string,
    string
  >;
  return {
    trainerEmail: raw.trainerEmail,
    clientName: raw.clientName,
    locationName: raw.locationName,
  };
}

test.describe("Trainer dashboard", () => {
  test("login → schedule → allocate", async ({ page }) => {
    const fixtures = loadFixtures();

    await loginAsTrainer(page, fixtures.trainerEmail);
    await expect(page.getByRole("heading", { name: "Weekly schedule" })).toBeVisible();
    await waitForScheduleReady(page);

    await openUnallocatedSlot(page, fixtures.locationName);
    await allocateOpenSlotToClient(page, fixtures.clientName);

    await expect(
      page
        .getByRole("button", {
          name: `${fixtures.clientName} ${fixtures.locationName}`,
        })
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
