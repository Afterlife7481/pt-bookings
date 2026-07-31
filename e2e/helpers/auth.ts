import { expect, type Page } from "@playwright/test";

/** Request OTP + verify so the page context receives the session cookie. */
export async function loginAsTrainer(page: Page, trainerEmail: string) {
  const loginRes = await page.request.post("/api/auth/otp/request", {
    data: { email: trainerEmail, purpose: "login" },
  });
  expect(loginRes.ok()).toBeTruthy();
  const loginData = await loginRes.json();
  expect(loginData.devCode).toBeTruthy();

  const verifyRes = await page.request.post("/api/auth/otp/verify", {
    data: { email: trainerEmail, code: loginData.devCode },
  });
  expect(verifyRes.ok()).toBeTruthy();

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/settings") && response.status() === 200,
    ),
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/schedule") && response.status() === 200,
    ),
    page.goto("/dashboard/schedule"),
  ]);

  await expect(page).toHaveURL(/\/dashboard\/schedule/);
}
