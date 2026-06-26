import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as relations from "./relations";
import path from "path";
import fs from "fs";
import { runMigrations } from "./migrate";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "pt-bookings.db");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

ensureDataDir();

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
    sqlite = new Database(DB_PATH);
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

export { schema, DB_PATH };
