import { defineConfig, devices } from "@playwright/test";
import path from "path";

const e2eDbPath = path.join(process.cwd(), "data", "pt-bookings-e2e.db");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run test:e2e:server",
    url: "http://localhost:3001/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PT_BOOKINGS_DB_PATH: e2eDbPath,
      E2E_TEST: "1",
    },
  },
});
