import fs from "fs";
import path from "path";
import { test, expect, type Page } from "@playwright/test";
import { loginAsTrainer } from "./helpers/auth";

type E2eFixtures = {
  trainerEmail: string;
  clientName: string;
  locationName: string;
  slotDayLabel: string;
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
    slotDayLabel: raw.slotDayLabel,
  };
}

async function waitForScheduleReady(page: Page) {
  await expect(page.getByText("Loading schedule…")).toBeHidden({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("tablist", { name: "Schedule view" }),
  ).toBeVisible();
}

test.describe("Trainer dashboard", () => {
  test("login → schedule → allocate", async ({ page }) => {
    const fixtures = loadFixtures();

    await loginAsTrainer(page, fixtures.trainerEmail);
    await expect(page.getByRole("heading", { name: "Weekly schedule" })).toBeVisible();
    await waitForScheduleReady(page);

    await page
      .getByRole("button", { name: new RegExp(`^${fixtures.slotDayLabel}\\b`) })
      .click();

    const openSlot = page.getByRole("button", {
      name: fixtures.locationName,
    });
    await expect(openSlot).toBeVisible({ timeout: 15_000 });
    await openSlot.click();

    await page.getByLabel("Client").selectOption({ label: fixtures.clientName });
    await page.getByRole("button", { name: "Allocate to client" }).click();

    await expect(
      page.getByRole("link", { name: fixtures.clientName }),
    ).toBeVisible();
  });
});
