import Database from "better-sqlite3";
import fs from "fs";
import { randomBytes } from "crypto";
import { resolveDataDir, resolveDbPath } from "./paths";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS trainers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  schedule_start_time TEXT NOT NULL DEFAULT '07:00',
  schedule_end_time TEXT NOT NULL DEFAULT '21:00',
  schedule_default_view TEXT NOT NULL DEFAULT 'day' CHECK(schedule_default_view IN ('day', 'week')),
  cancel_deadline_hours INTEGER NOT NULL DEFAULT 36,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  trainer_id TEXT NOT NULL REFERENCES trainers(id),
  token TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  last_minute_opt_in INTEGER NOT NULL DEFAULT 0,
  session_price INTEGER,
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
  const dbPath = resolveDbPath();
  const dataDir = resolveDataDir(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(MIGRATION_SQL);
  upgradeRecurringPreferencesSchema(sqlite);
  upgradeTrainerSettingsSchema(sqlite);
  upgradeClientTokenSchema(sqlite);
  upgradeBookingsSlotSchema(sqlite);
  upgradeTrainerAuthSchema(sqlite);
  upgradeClientEmailSchema(sqlite);
  upgradeAppliedWeeksDropTemplate(sqlite);
  upgradeLocationsSchema(sqlite);
  upgradeSlotLocationSchema(sqlite);
  upgradeClientSessionPriceSchema(sqlite);
  upgradeLastMinuteFlowSchema(sqlite);
  upgradeLocationAddressSchema(sqlite);
  upgradeRecurringPreferenceLocationSchema(sqlite);
  upgradeDefaultTemplateSchema(sqlite);
  upgradeSingleWeeklyTemplatePerTrainer(sqlite);
  upgradeSlotDurationSchema(sqlite);
  upgradeBookingPaymentSchema(sqlite);
  upgradeTrainerPaymentDetailsSchema(sqlite);
  upgradeBookingInvoiceSchema(sqlite);
  upgradeTrainerPaymentPayeeSchema(sqlite);
  upgradeWhatsAppInvoiceMessageType(sqlite);
  upgradeBookingVoidedStatusSchema(sqlite);
  sqlite.close();
}

function upgradeSlotLocationSchema(sqlite: Database.Database) {
  const slotColumns = sqlite
    .prepare("PRAGMA table_info(slots)")
    .all() as { name: string }[];
  if (!slotColumns.some((c) => c.name === "location_id")) {
    sqlite.exec(
      "ALTER TABLE slots ADD COLUMN location_id TEXT REFERENCES locations(id) ON DELETE SET NULL",
    );
  }

  const templateColumns = sqlite
    .prepare("PRAGMA table_info(template_slots)")
    .all() as { name: string }[];
  if (!templateColumns.some((c) => c.name === "location_id")) {
    sqlite.exec(
      "ALTER TABLE template_slots ADD COLUMN location_id TEXT REFERENCES locations(id) ON DELETE SET NULL",
    );
  }
}

function upgradeLocationsSchema(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS client_locations (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS client_locations_client_location_idx
    ON client_locations(client_id, location_id);
  `);
}

function upgradeTrainerAuthSchema(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS trainer_magic_links (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      purpose TEXT NOT NULL CHECK(purpose IN ('signup', 'login')),
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trainer_sessions (
      id TEXT PRIMARY KEY,
      trainer_id TEXT NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function upgradeAppliedWeeksDropTemplate(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(applied_weeks)")
    .all() as { name: string }[];

  if (!columns.some((c) => c.name === "template_id")) {
    if (tableExists(sqlite, "applied_weeks_new")) {
      sqlite.exec("DROP TABLE applied_weeks_new");
    }
    return;
  }

  if (tableExists(sqlite, "applied_weeks_new")) {
    sqlite.exec("DROP TABLE applied_weeks_new");
  }

  sqlite.pragma("foreign_keys = OFF");
  sqlite.exec(`
    CREATE TABLE applied_weeks_new (
      id TEXT PRIMARY KEY,
      trainer_id TEXT NOT NULL REFERENCES trainers(id),
      week_start TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    INSERT INTO applied_weeks_new (id, trainer_id, week_start, created_at)
    SELECT id, trainer_id, week_start, created_at FROM applied_weeks;

    DROP TABLE applied_weeks;
    ALTER TABLE applied_weeks_new RENAME TO applied_weeks;

    CREATE UNIQUE INDEX IF NOT EXISTS applied_weeks_trainer_week_idx
    ON applied_weeks(trainer_id, week_start);
  `);
  sqlite.pragma("foreign_keys = ON");
}

function upgradeClientEmailSchema(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(clients)")
    .all() as { name: string }[];

  if (!columns.some((c) => c.name === "email")) {
    sqlite.exec(
      "ALTER TABLE clients ADD COLUMN email TEXT NOT NULL DEFAULT ''",
    );
  }
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
  if (!names.has("schedule_default_view")) {
    sqlite.exec(
      "ALTER TABLE trainers ADD COLUMN schedule_default_view TEXT NOT NULL DEFAULT 'day' CHECK(schedule_default_view IN ('day', 'week'))",
    );
  }
}

function upgradeLastMinuteFlowSchema(sqlite: Database.Database) {
  const trainerColumns = sqlite
    .prepare("PRAGMA table_info(trainers)")
    .all() as { name: string }[];
  if (!trainerColumns.some((c) => c.name === "last_minute_offer_lock_hours")) {
    sqlite.exec(
      "ALTER TABLE trainers ADD COLUMN last_minute_offer_lock_hours INTEGER NOT NULL DEFAULT 1",
    );
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS client_last_minute_preferences (
      id TEXT PRIMARY KEY,
      trainer_id TEXT NOT NULL REFERENCES trainers(id),
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS client_last_minute_prefs_slot_idx
    ON client_last_minute_preferences(client_id, day_of_week, start_time);
  `);

  const slotColumns = sqlite
    .prepare("PRAGMA table_info(slots)")
    .all() as { name: string }[];
  if (!slotColumns.some((c) => c.name === "held_for_client_id")) {
    sqlite.exec(
      "ALTER TABLE slots ADD COLUMN held_for_client_id TEXT REFERENCES clients(id) ON DELETE SET NULL",
    );
  }
  if (!slotColumns.some((c) => c.name === "hold_expires_at")) {
    sqlite.exec("ALTER TABLE slots ADD COLUMN hold_expires_at TEXT");
  }

  const interestTable = sqlite
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='last_minute_interests'",
    )
    .get() as { sql: string } | undefined;

  if (
    interestTable?.sql &&
    interestTable.sql.includes("'interested'")
  ) {
    sqlite.exec(`
      CREATE TABLE last_minute_interests_new (
        id TEXT PRIMARY KEY,
        trainer_id TEXT NOT NULL REFERENCES trainers(id),
        slot_id TEXT NOT NULL REFERENCES slots(id),
        client_id TEXT NOT NULL REFERENCES clients(id),
        status TEXT NOT NULL CHECK(status IN ('offered', 'accepted', 'expired', 'superseded', 'declined')),
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT,
        created_at TEXT NOT NULL
      );
      INSERT INTO last_minute_interests_new
      SELECT
        id,
        trainer_id,
        slot_id,
        client_id,
        CASE status
          WHEN 'interested' THEN 'offered'
          WHEN 'assigned' THEN 'accepted'
          WHEN 'not_selected' THEN 'superseded'
          ELSE status
        END,
        token,
        NULL,
        created_at
      FROM last_minute_interests;
      DROP TABLE last_minute_interests;
      ALTER TABLE last_minute_interests_new RENAME TO last_minute_interests;
    `);
  } else {
    const interestColumns = sqlite
      .prepare("PRAGMA table_info(last_minute_interests)")
      .all() as { name: string }[];
    if (
      interestTable &&
      !interestColumns.some((c) => c.name === "expires_at")
    ) {
      sqlite.exec(
        "ALTER TABLE last_minute_interests ADD COLUMN expires_at TEXT",
      );
    }
  }
}

function upgradeLocationAddressSchema(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(locations)")
    .all() as { name: string }[];

  if (!columns.some((c) => c.name === "address")) {
    sqlite.exec("ALTER TABLE locations ADD COLUMN address TEXT");
  }
}

function upgradeClientSessionPriceSchema(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(clients)")
    .all() as { name: string }[];

  if (!columns.some((c) => c.name === "session_price")) {
    sqlite.exec("ALTER TABLE clients ADD COLUMN session_price INTEGER");
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

function upgradeSingleWeeklyTemplatePerTrainer(sqlite: Database.Database) {
  const trainersWithMultiple = sqlite
    .prepare(
      `SELECT trainer_id FROM weekly_templates
       GROUP BY trainer_id HAVING COUNT(*) > 1`,
    )
    .all() as { trainer_id: string }[];

  const trainerColumns = sqlite
    .prepare("PRAGMA table_info(trainers)")
    .all() as { name: string }[];
  const hasDefaultTemplateColumn = trainerColumns.some(
    (c) => c.name === "default_template_id",
  );

  const getDefaultTemplateId = hasDefaultTemplateColumn
    ? sqlite.prepare("SELECT default_template_id FROM trainers WHERE id = ?")
    : null;
  const getOldestTemplateId = sqlite.prepare(
    `SELECT id FROM weekly_templates
     WHERE trainer_id = ? ORDER BY created_at ASC LIMIT 1`,
  );
  const deleteExtraTemplates = sqlite.prepare(
    "DELETE FROM weekly_templates WHERE trainer_id = ? AND id != ?",
  );

  for (const { trainer_id } of trainersWithMultiple) {
    let keepId: string | null = null;
    if (getDefaultTemplateId) {
      const trainer = getDefaultTemplateId.get(trainer_id) as
        | { default_template_id: string | null }
        | undefined;
      keepId = trainer?.default_template_id ?? null;
    }
    if (!keepId) {
      const oldest = getOldestTemplateId.get(trainer_id) as
        | { id: string }
        | undefined;
      keepId = oldest?.id ?? null;
    }
    if (!keepId) continue;

    deleteExtraTemplates.run(trainer_id, keepId);
  }

  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS weekly_templates_trainer_idx
    ON weekly_templates(trainer_id);
  `);
}

function upgradeRecurringPreferenceLocationSchema(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(recurring_preferences)")
    .all() as { name: string }[];

  if (!columns.some((c) => c.name === "location_id")) {
    sqlite.exec(
      "ALTER TABLE recurring_preferences ADD COLUMN location_id TEXT REFERENCES locations(id) ON DELETE SET NULL",
    );
  }
}

function upgradeDefaultTemplateSchema(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(trainers)")
    .all() as { name: string }[];

  if (!columns.some((c) => c.name === "default_template_id")) {
    sqlite.exec(
      "ALTER TABLE trainers ADD COLUMN default_template_id TEXT REFERENCES weekly_templates(id) ON DELETE SET NULL",
    );
  }

  const trainersWithoutDefault = sqlite
    .prepare(
      "SELECT id FROM trainers WHERE default_template_id IS NULL OR default_template_id = ''",
    )
    .all() as { id: string }[];

  const firstTemplate = sqlite.prepare(
    "SELECT id FROM weekly_templates WHERE trainer_id = ? ORDER BY created_at ASC LIMIT 1",
  );

  const setDefault = sqlite.prepare(
    "UPDATE trainers SET default_template_id = ? WHERE id = ?",
  );

  for (const trainer of trainersWithoutDefault) {
    const template = firstTemplate.get(trainer.id) as { id: string } | undefined;
    if (template) {
      setDefault.run(template.id, trainer.id);
    }
  }
}

function addOneHourToTime(startTime: string): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const total = (hours ?? 0) * 60 + (minutes ?? 0) + 60;
  const endHours = Math.floor(total / 60);
  const endMinutes = total % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

function addOneHourToStartAt(startAt: string): string {
  const [datePart, timePart = "00:00:00"] = startAt.split("T");
  const endTime = addOneHourToTime(timePart.slice(0, 5));
  return `${datePart}T${endTime}:00`;
}

function upgradeSlotDurationSchema(sqlite: Database.Database) {
  const templateColumns = sqlite
    .prepare("PRAGMA table_info(template_slots)")
    .all() as { name: string }[];

  if (!templateColumns.some((c) => c.name === "end_time")) {
    sqlite.exec("ALTER TABLE template_slots ADD COLUMN end_time TEXT");
    const rows = sqlite
      .prepare("SELECT id, start_time FROM template_slots")
      .all() as { id: string; start_time: string }[];
    const update = sqlite.prepare(
      "UPDATE template_slots SET end_time = ? WHERE id = ?",
    );
    for (const row of rows) {
      update.run(addOneHourToTime(row.start_time), row.id);
    }
  }

  const slotColumns = sqlite
    .prepare("PRAGMA table_info(slots)")
    .all() as { name: string }[];

  if (!slotColumns.some((c) => c.name === "end_at")) {
    sqlite.exec("ALTER TABLE slots ADD COLUMN end_at TEXT");
    const rows = sqlite
      .prepare("SELECT id, start_at FROM slots")
      .all() as { id: string; start_at: string }[];
    const update = sqlite.prepare("UPDATE slots SET end_at = ? WHERE id = ?");
    for (const row of rows) {
      update.run(addOneHourToStartAt(row.start_at), row.id);
    }
  }
}

function upgradeBookingPaymentSchema(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(bookings)")
    .all() as { name: string }[];

  if (!columns.some((c) => c.name === "session_paid")) {
    sqlite.exec(
      "ALTER TABLE bookings ADD COLUMN session_paid INTEGER NOT NULL DEFAULT 0",
    );
  }

  if (!columns.some((c) => c.name === "payment_type")) {
    sqlite.exec(`
      ALTER TABLE bookings ADD COLUMN payment_type TEXT
      CHECK(payment_type IS NULL OR payment_type IN ('cash', 'bank_transfer', 'card', 'other'))
    `);
  }
}

function upgradeTrainerPaymentDetailsSchema(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(trainers)")
    .all() as { name: string }[];

  if (!columns.some((c) => c.name === "bank_account_number")) {
    sqlite.exec("ALTER TABLE trainers ADD COLUMN bank_account_number TEXT");
  }

  if (!columns.some((c) => c.name === "bank_sort_code")) {
    sqlite.exec("ALTER TABLE trainers ADD COLUMN bank_sort_code TEXT");
  }
}

function upgradeBookingInvoiceSchema(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(bookings)")
    .all() as { name: string }[];

  if (!columns.some((c) => c.name === "invoice_sent_at")) {
    sqlite.exec("ALTER TABLE bookings ADD COLUMN invoice_sent_at TEXT");
  }
}

function upgradeTrainerPaymentPayeeSchema(sqlite: Database.Database) {
  const columns = sqlite
    .prepare("PRAGMA table_info(trainers)")
    .all() as { name: string }[];

  if (!columns.some((c) => c.name === "bank_name")) {
    sqlite.exec("ALTER TABLE trainers ADD COLUMN bank_name TEXT");
  }

  if (!columns.some((c) => c.name === "payment_payee_name")) {
    sqlite.exec("ALTER TABLE trainers ADD COLUMN payment_payee_name TEXT");
  }
}

function upgradeWhatsAppInvoiceMessageType(sqlite: Database.Database) {
  const table = sqlite
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='whatsapp_messages'",
    )
    .get() as { sql: string } | undefined;

  if (!table?.sql || table.sql.includes("'invoice'")) return;

  sqlite.exec(`
    CREATE TABLE whatsapp_messages_new (
      id TEXT PRIMARY KEY,
      trainer_id TEXT NOT NULL REFERENCES trainers(id),
      client_id TEXT REFERENCES clients(id),
      phone TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK(message_type IN ('confirmation', 'last_minute', 'interest_ack', 'invoice')),
      body TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'sent', 'failed')),
      created_at TEXT NOT NULL
    );
    INSERT INTO whatsapp_messages_new
    SELECT id, trainer_id, client_id, phone, message_type, body, status, created_at
    FROM whatsapp_messages;
    DROP TABLE whatsapp_messages;
    ALTER TABLE whatsapp_messages_new RENAME TO whatsapp_messages;
  `);
}

function upgradeBookingVoidedStatusSchema(sqlite: Database.Database) {
  const table = sqlite
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='bookings'",
    )
    .get() as { sql: string } | undefined;

  if (!table?.sql || table.sql.includes("'voided'")) return;

  const columns = sqlite
    .prepare("PRAGMA table_info(bookings)")
    .all() as { name: string }[];

  const columnNames = columns.map((c) => c.name);
  const hasSessionPaid = columnNames.includes("session_paid");
  const hasPaymentType = columnNames.includes("payment_type");
  const hasInvoiceSentAt = columnNames.includes("invoice_sent_at");

  sqlite.pragma("foreign_keys = OFF");
  try {
    sqlite.exec(`
      CREATE TABLE bookings_void_migration (
        id TEXT PRIMARY KEY,
        trainer_id TEXT NOT NULL REFERENCES trainers(id),
        slot_id TEXT REFERENCES slots(id),
        session_start_at TEXT NOT NULL,
        client_id TEXT NOT NULL REFERENCES clients(id),
        token TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK(status IN ('confirmed', 'pending_change', 'canceled', 'voided')),
        override_36h INTEGER NOT NULL DEFAULT 0,
        is_recurring INTEGER NOT NULL DEFAULT 0,
        session_paid INTEGER NOT NULL DEFAULT 0,
        payment_type TEXT CHECK(payment_type IS NULL OR payment_type IN ('cash', 'bank_transfer', 'card', 'other')),
        invoice_sent_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO bookings_void_migration (
        id, trainer_id, slot_id, session_start_at, client_id, token, status,
        override_36h, is_recurring, session_paid, payment_type, invoice_sent_at,
        created_at, updated_at
      )
      SELECT
        id,
        trainer_id,
        slot_id,
        session_start_at,
        client_id,
        token,
        status,
        override_36h,
        is_recurring,
        ${hasSessionPaid ? "session_paid" : "0"},
        ${hasPaymentType ? "payment_type" : "NULL"},
        ${hasInvoiceSentAt ? "invoice_sent_at" : "NULL"},
        created_at,
        updated_at
      FROM bookings;

      DROP TABLE bookings;
      ALTER TABLE bookings_void_migration RENAME TO bookings;
    `);
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }

  createBookingsActiveSlotIndex(sqlite);
}

if (require.main === module) {
  runMigrations();
  console.log("Migrations applied.");
}

export { resolveDbPath as DB_PATH } from "./paths";
