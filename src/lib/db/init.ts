import { runMigrations } from "./migrate";

let initialized = false;

export async function ensureDb() {
  if (!initialized) {
    runMigrations();
    initialized = true;
  }
}

export function resetEnsureDb() {
  initialized = false;
}
