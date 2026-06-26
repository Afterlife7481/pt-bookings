import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "pt-bookings.db");

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS trainers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  schedule_start_time TEXT NOT NULL DEFAULT '07:00',
  schedule_end_time TEXT NOT NULL DEFAULT '21:00',
  cancel_deadline_hours INTEGER NOT NULL DEFAULT 36,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id),
  token TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  last_minute_opt_in INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_templates (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS template_slots (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES weekly_templates(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applied_weeks (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id),
  template_id TEXT NOT NULL REFERENCES weekly_templates(id),
  week_start TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS applied_weeks_trainer_week_idx ON applied_weeks(trainer_id, week_start);

CREATE TABLE IF NOT EXISTS slots (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id),
  applied_week_id TEXT NOT NULL REFERENCES applied_weeks(id) ON DELETE CASCADE,
  start_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('available', 'booked', 'pending_change')),
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS slots_trainer_start_idx ON slots(trainer_id, start_at);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id),
  slot_id TEXT REFERENCES slots(id),
  session_start_at TEXT NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id),
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('confirmed', 'pending_change', 'canceled')),
  override_36h INTEGER NOT NULL DEFAULT 0,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_idx ON bookings(slot_id) WHERE slot_id IS NOT NULL AND status != 'canceled';

CREATE TABLE IF NOT EXISTS recurring_preferences (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS recurring_preferences_slot_idx ON recurring_preferences(trainer_id, day_of_week, start_time);

CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id),
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  from_slot_id TEXT NOT NULL REFERENCES slots(id),
  to_slot_id TEXT REFERENCES slots(id),
  status TEXT NOT NULL CHECK(status IN ('browsing', 'confirmed', 'expired', 'blocked')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS last_minute_interests (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id),
  slot_id TEXT NOT NULL REFERENCES slots(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  status TEXT NOT NULL CHECK(status IN ('interested', 'assigned', 'not_selected')),
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id),
  client_id TEXT REFERENCES clients(id),
  phone TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK(message_type IN ('confirmation', 'last_minute', 'interest_ack')),
  body TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'failed')),
  created_at TEXT NOT NULL
);
`;

export function runMigrations() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(MIGRATION_SQL);
  upgradeRecurringPreferencesSchema(sqlite);
  upgradeTrainerSettingsSchema(sqlite);
  upgradeClientTokenSchema(sqlite);
  upgradeBookingsSlotSchema(sqlite);
  sqlite.close();
}

function tableExists(sqlite: Database.Database, name: string): boolean {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name) as { name: string } | undefined;
  return !!row;
}

function createBookingsActiveSlotIndex(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot_idx
    ON bookings(slot_id)
    WHERE slot_id IS NOT NULL AND status != 'canceled'
  `);
}

function upgradeBookingsSlotSchema(sqlite: Database.Database) {
  const hasBookings = tableExists(sqlite, "bookings");
  const hasBookingsNew = tableExists(sqlite, "bookings_new");

  if (hasBookings) {
    const columns = sqlite
      .prepare("PRAGMA table_info(bookings)")
      .all() as { name: string }[];

    if (columns.some((c) => c.name === "session_start_at")) {
      createBookingsActiveSlotIndex(sqlite);
      if (hasBookingsNew) {
        sqlite.exec("DROP TABLE bookings_new");
      }
      return;
    }
  }

  // Previous migration dropped bookings but failed before rename.
  if (!hasBookings && hasBookingsNew) {
    sqlite.pragma("foreign_keys = OFF");
    try {
      sqlite.exec("ALTER TABLE bookings_new RENAME TO bookings");
    } finally {
      sqlite.pragma("foreign_keys = ON");
    }
    createBookingsActiveSlotIndex(sqlite);
    return;
  }

  if (!hasBookings) {
    throw new Error("bookings table is missing and cannot be migrated");
  }

  // Clean up a partial migration before retrying.
  if (hasBookingsNew) {
    sqlite.exec("DROP TABLE bookings_new");
  }

  sqlite.pragma("foreign_keys = OFF");
  try {
    sqlite.exec(`
      CREATE TABLE bookings_new (
        id TEXT PRIMARY KEY,
        trainer_id TEXT NOT NULL REFERENCES trainers(id),
        slot_id TEXT REFERENCES slots(id),
        session_start_at TEXT NOT NULL,
        client_id TEXT NOT NULL REFERENCES clients(id),
        token TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK(status IN ('confirmed', 'pending_change', 'canceled')),
        override_36h INTEGER NOT NULL DEFAULT 0,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO bookings_new (
        id, trainer_id, slot_id, session_start_at, client_id, token, status,
        override_36h, is_recurring, created_at, updated_at
      )
      SELECT
        b.id,
        b.trainer_id,
        CASE WHEN b.status = 'canceled' THEN NULL ELSE b.slot_id END,
        COALESCE(s.start_at, b.created_at),
        b.client_id,
        b.token,
        b.status,
        b.override_36h,
        b.is_recurring,
        b.created_at,
        b.updated_at
      FROM bookings b
      LEFT JOIN slots s ON s.id = b.slot_id;

      DROP TABLE bookings;
      ALTER TABLE bookings_new RENAME TO bookings;
    `);
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }

  createBookingsActiveSlotIndex(sqlite);
}

function upgradeClientTokenSchema(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(clients)")
    .all() as { name: string }[];

  const names = new Set(columns.map((c) => c.name));
  if (!names.has("token")) {
    sqlite.exec("ALTER TABLE clients ADD COLUMN token TEXT");
  }

  const missing = sqlite
    .prepare("SELECT id FROM clients WHERE token IS NULL OR token = ''")
    .all() as { id: string }[];

  const update = sqlite.prepare("UPDATE clients SET token = ? WHERE id = ?");
  for (const row of missing) {
    update.run(randomBytes(9).toString("base64url"), row.id);
  }

  sqlite.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS clients_token_idx ON clients(token)",
  );
}

function upgradeTrainerSettingsSchema(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(trainers)")
    .all() as { name: string }[];

  const names = new Set(columns.map((c) => c.name));
  if (!names.has("schedule_start_time")) {
    sqlite.exec(
      "ALTER TABLE trainers ADD COLUMN schedule_start_time TEXT NOT NULL DEFAULT '07:00'",
    );
  }
  if (!names.has("schedule_end_time")) {
    sqlite.exec(
      "ALTER TABLE trainers ADD COLUMN schedule_end_time TEXT NOT NULL DEFAULT '21:00'",
    );
  }
  if (!names.has("cancel_deadline_hours")) {
    sqlite.exec(
      "ALTER TABLE trainers ADD COLUMN cancel_deadline_hours INTEGER NOT NULL DEFAULT 36",
    );
  }
}

function upgradeRecurringPreferencesSchema(sqlite: Database.Database) {
  const table = sqlite
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='recurring_preferences'",
    )
    .get() as { sql: string } | undefined;

  if (table?.sql?.includes("client_id") && table.sql.includes("UNIQUE")) {
    sqlite.exec(`
      CREATE TABLE recurring_preferences_new (
        id TEXT PRIMARY KEY,
        trainer_id TEXT NOT NULL REFERENCES trainers(id),
        client_id TEXT NOT NULL REFERENCES clients(id),
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      INSERT INTO recurring_preferences_new SELECT * FROM recurring_preferences;
      DROP TABLE recurring_preferences;
      ALTER TABLE recurring_preferences_new RENAME TO recurring_preferences;
      CREATE UNIQUE INDEX IF NOT EXISTS recurring_preferences_slot_idx ON recurring_preferences(trainer_id, day_of_week, start_time);
    `);
  } else {
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS recurring_preferences_slot_idx ON recurring_preferences(trainer_id, day_of_week, start_time);
    `);
  }
}

if (require.main === module) {
  runMigrations();
  console.log("Migrations applied.");
}

export { DB_PATH };
