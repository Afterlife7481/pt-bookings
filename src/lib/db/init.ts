import { assertUtcProcessTimezone } from "@/lib/process-timezone";
import { runMigrations } from "./migrate";

let initialized = false;

export async function ensureDb() {
  if (!initialized) {
    assertUtcProcessTimezone();
    await runMigrations();
    initialized = true;
  }
}

export function resetEnsureDb() {
  initialized = false;
}
