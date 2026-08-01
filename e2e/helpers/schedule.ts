import { expect, type Page } from "@playwright/test";

export async function waitForScheduleReady(page: Page) {
  await expect(page.getByText("Loading schedule…")).toBeHidden({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("tablist", { name: "Schedule view" }),
  ).toBeVisible();
}

/** Open an unallocated slot by its location name in week view. */
export async function openUnallocatedSlot(
  page: Page,
  locationName: string,
) {
  await page.getByRole("tab", { name: "week" }).click();
  const openSlot = page.getByRole("button", {
    name: locationName,
    exact: true,
  });
  await expect(openSlot.first()).toBeVisible({ timeout: 15_000 });
  await openSlot.first().click();
  await expect(page.getByRole("heading", { name: "Open slot" })).toBeVisible();
}

/** Allocate the open-slot sheet to a client and wait for the sheet to close. */
export async function allocateOpenSlotToClient(page: Page, clientName: string) {
  await page.getByLabel("Client").selectOption({ label: clientName });
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });
}
