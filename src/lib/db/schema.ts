import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const trainers = sqliteTable("trainers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  timezone: text("timezone").notNull().default("Europe/London"),
  scheduleStartTime: text("schedule_start_time").notNull().default("07:00"),
  scheduleEndTime: text("schedule_end_time").notNull().default("21:00"),
  scheduleDefaultView: text("schedule_default_view", { enum: ["day", "week"] })
    .notNull()
    .default("day"),
  cancelDeadlineHours: integer("cancel_deadline_hours").notNull().default(36),
  lastMinuteOfferLockHours: integer("last_minute_offer_lock_hours")
    .notNull()
    .default(1),
  createdAt: text("created_at").notNull(),
});

export const trainerMagicLinks = sqliteTable(
  "trainer_magic_links",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    purpose: text("purpose", { enum: ["signup", "login"] }).notNull(),
    token: text("token").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at").notNull(),
  },
);

export const trainerSessions = sqliteTable(
  "trainer_sessions",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
);

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id),
  token: text("token").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull(),
  lastMinuteOptIn: integer("last_minute_opt_in", { mode: "boolean" })
    .notNull()
    .default(false),
  /** Price per session in pence (e.g. 5000 = £50.00). Null if not set. */
  sessionPrice: integer("session_price"),
  createdAt: text("created_at").notNull(),
});

export const locations = sqliteTable("locations", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: text("created_at").notNull(),
});

export const clientLocations = sqliteTable(
  "client_locations",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    uniqueClientLocation: uniqueIndex("client_locations_client_location_idx").on(
      table.clientId,
      table.locationId,
    ),
  }),
);

export const weeklyTemplates = sqliteTable(
  "weekly_templates",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    uniqueTrainer: uniqueIndex("weekly_templates_trainer_idx").on(table.trainerId),
  }),
);

export const templateSlots = sqliteTable("template_slots", {
  id: text("id").primaryKey(),
  templateId: text("template_id")
    .notNull()
    .references(() => weeklyTemplates.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun .. 6=Sat
  startTime: text("start_time").notNull(), // HH:mm
  locationId: text("location_id").references(() => locations.id, {
    onDelete: "set null",
  }),
});

export const appliedWeeks = sqliteTable(
  "applied_weeks",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id),
    weekStart: text("week_start").notNull(), // YYYY-MM-DD (Monday)
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    uniqueWeek: uniqueIndex("applied_weeks_trainer_week_idx").on(
      table.trainerId,
      table.weekStart,
    ),
  }),
);

export const slots = sqliteTable(
  "slots",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id),
    appliedWeekId: text("applied_week_id")
      .notNull()
      .references(() => appliedWeeks.id, { onDelete: "cascade" }),
    startAt: text("start_at").notNull(), // ISO datetime
    status: text("status", {
      enum: ["available", "booked", "pending_change"],
    }).notNull(),
    locationId: text("location_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    heldForClientId: text("held_for_client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    holdExpiresAt: text("hold_expires_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    uniqueStart: uniqueIndex("slots_trainer_start_idx").on(
      table.trainerId,
      table.startAt,
    ),
  }),
);

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id),
  slotId: text("slot_id").references(() => slots.id),
  sessionStartAt: text("session_start_at").notNull(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id),
  token: text("token").notNull().unique(),
  status: text("status", {
    enum: ["confirmed", "pending_change", "canceled"],
  }).notNull(),
  override36h: integer("override_36h", { mode: "boolean" })
    .notNull()
    .default(false),
  isRecurring: integer("is_recurring", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const recurringPreferences = sqliteTable(
  "recurring_preferences",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    locationId: text("location_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    uniqueSlot: uniqueIndex("recurring_preferences_slot_idx").on(
      table.trainerId,
      table.dayOfWeek,
      table.startTime,
    ),
  }),
);

export const changeRequests = sqliteTable("change_requests", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id),
  fromSlotId: text("from_slot_id")
    .notNull()
    .references(() => slots.id),
  toSlotId: text("to_slot_id").references(() => slots.id),
  status: text("status", {
    enum: ["browsing", "confirmed", "expired", "blocked"],
  }).notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const clientLastMinutePreferences = sqliteTable(
  "client_last_minute_preferences",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    uniqueSlot: uniqueIndex("client_last_minute_prefs_slot_idx").on(
      table.clientId,
      table.dayOfWeek,
      table.startTime,
    ),
  }),
);

export const lastMinuteInterests = sqliteTable("last_minute_interests", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id),
  slotId: text("slot_id")
    .notNull()
    .references(() => slots.id),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id),
  status: text("status", {
    enum: ["offered", "accepted", "expired", "superseded", "declined"],
  }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull(),
});

export const whatsappMessages = sqliteTable("whatsapp_messages", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id),
  clientId: text("client_id").references(() => clients.id),
  phone: text("phone").notNull(),
  messageType: text("message_type", {
    enum: ["confirmation", "last_minute", "interest_ack"],
  }).notNull(),
  body: text("body").notNull(),
  status: text("status", {
    enum: ["pending", "sent", "failed"],
  }).notNull(),
  createdAt: text("created_at").notNull(),
});

export type Trainer = typeof trainers.$inferSelect;
export type TrainerMagicLink = typeof trainerMagicLinks.$inferSelect;
export type TrainerSession = typeof trainerSessions.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type ClientLocation = typeof clientLocations.$inferSelect;
export type WeeklyTemplate = typeof weeklyTemplates.$inferSelect;
export type TemplateSlot = typeof templateSlots.$inferSelect;
export type AppliedWeek = typeof appliedWeeks.$inferSelect;
export type Slot = typeof slots.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type RecurringPreference = typeof recurringPreferences.$inferSelect;
export type ClientLastMinutePreference =
  typeof clientLastMinutePreferences.$inferSelect;
export type ChangeRequest = typeof changeRequests.$inferSelect;
export type LastMinuteInterest = typeof lastMinuteInterests.$inferSelect;
