import { runMigrations } from "./migrate";

let initialized = false;

export async function ensureDb() {
  if (!initialized) {
    runMigrations();
    const { seed } = await import("./seed");
    await seed();
    initialized = true;
  }
}
