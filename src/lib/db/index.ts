import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as relations from "./relations";
import fs from "fs";
import { runMigrations } from "./migrate";
import { resolveDataDir, resolveDbPath } from "./paths";

function ensureDataDir() {
  const dataDir = resolveDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

let sqlite: Database.Database | null = null;
let dbInstance: ReturnType<
  typeof drizzle<typeof schema & typeof relations>
> | null = null;
let migrated = false;

export function getDb() {
  if (!dbInstance) {
    ensureDataDir();
    if (!migrated) {
      runMigrations();
      migrated = true;
    }
    const dbPath = resolveDbPath();
    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    dbInstance = drizzle(sqlite, { schema: { ...schema, ...relations } });
  }
  return dbInstance;
}

export function getSqlite() {
  if (!sqlite) {
    getDb();
  }
  return sqlite!;
}

export function resetDbConnection() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
  }
  dbInstance = null;
  migrated = false;
}

export { schema, resolveDbPath as DB_PATH };
