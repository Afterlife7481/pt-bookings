import fs from "fs";
import path from "path";
import { test, expect, type Page } from "@playwright/test";

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

    const loginRes = await page.request.post("/api/auth/magic-link", {
      data: { email: fixtures.trainerEmail, purpose: "login" },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    expect(loginData.devLink).toBeTruthy();

    const verifyUrl = new URL(loginData.devLink as string);
    const verifyPath = `${verifyUrl.pathname}${verifyUrl.search}`;

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/settings") && response.status() === 200,
      ),
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/schedule") && response.status() === 200,
      ),
      page.goto(verifyPath),
    ]);

    await expect(page).toHaveURL(/\/dashboard\/schedule/);
    await expect(page.getByRole("heading", { name: "Weekly schedule" })).toBeVisible();
    await waitForScheduleReady(page);

    const openSlot = page.getByTitle(fixtures.locationName);
    await expect(openSlot).toBeVisible({ timeout: 15_000 });
    await openSlot.click();

    await page.getByLabel("Client").selectOption({ label: fixtures.clientName });
    await page.getByRole("button", { name: "Allocate to client" }).click();

    await expect(
      page.getByRole("link", { name: fixtures.clientName }),
    ).toBeVisible();
  });
});
