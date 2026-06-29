import { runMigrations } from "./migrate";

let initialized = false;

export async function ensureDb() {
  if (!initialized) {
    await runMigrations();
    initialized = true;
  }
}

export function resetEnsureDb() {
  initialized = false;
}
