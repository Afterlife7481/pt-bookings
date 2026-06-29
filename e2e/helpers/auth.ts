import { expect, type Page } from "@playwright/test";

export async function loginAsTrainer(page: Page, trainerEmail: string) {
  const loginRes = await page.request.post("/api/auth/magic-link", {
    data: { email: trainerEmail, purpose: "login" },
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
}
