import path from "path";

export function resolveDbPath(): string {
  const envPath = process.env.PT_BOOKINGS_DB_PATH?.trim();
  if (envPath) {
    return path.resolve(envPath);
  }
  return path.join(process.cwd(), "data", "pt-bookings.db");
}

export function resolveDataDir(dbPath = resolveDbPath()): string {
  return path.dirname(dbPath);
}
