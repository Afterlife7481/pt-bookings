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

test.describe("Feed tab", () => {
  test("shows a booking confirmation after notifying a client", async ({
    page,
  }) => {
    const fixtures = loadFixtures();

    await loginAsTrainer(page, fixtures.trainerEmail);
    await expect(
      page.getByRole("heading", { name: "Weekly schedule" }),
    ).toBeVisible();
    await waitForScheduleReady(page);

    await openUnallocatedSlot(page, fixtures.locationName);
    await allocateOpenSlotToClient(page, fixtures.clientName);

    const bookedSlot = page.getByRole("button", {
      name: `${fixtures.clientName} ${fixtures.locationName}`,
    });
    await expect(bookedSlot.first()).toBeVisible({ timeout: 15_000 });
    await bookedSlot.first().click();

    await page.getByRole("button", { name: "Notify client" }).click();
    await page.getByRole("radio", { name: /Send by WhatsApp/i }).check();
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await page.goto("/dashboard/feed");
    await expect(page.getByText("Loading feed…")).toBeHidden({
      timeout: 15_000,
    });

    await expect(page.getByText("Booking confirmation").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/session is booked for/i).first()).toBeVisible();
    await expect(page.getByText("WhatsApp").first()).toBeVisible();
  });
});
