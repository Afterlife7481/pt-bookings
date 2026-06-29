import { config } from "dotenv";
import path from "path";
import { beforeEach } from "vitest";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

config({ path: path.join(process.cwd(), ".env.local") });

const testDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL must be set in .env.local. Tests use an isolated database and never modify DATABASE_URL (dev data).",
  );
}

process.env.DATABASE_URL = testDatabaseUrl;

beforeEach(() => {
  resetRateLimitsForTests();
});
