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
  cancelDeadlineHours: integer("cancel_deadline_hours").notNull().default(36),
  createdAt: text("created_at").notNull(),
});

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id),
  token: text("token").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  lastMinuteOptIn: integer("last_minute_opt_in", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at").notNull(),
});

export const weeklyTemplates = sqliteTable("weekly_templates", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const templateSlots = sqliteTable("template_slots", {
  id: text("id").primaryKey(),
  templateId: text("template_id")
    .notNull()
    .references(() => weeklyTemplates.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun .. 6=Sat
  startTime: text("start_time").notNull(), // HH:mm
});

export const appliedWeeks = sqliteTable(
  "applied_weeks",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id),
    templateId: text("template_id")
      .notNull()
      .references(() => weeklyTemplates.id),
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
    enum: ["interested", "assigned", "not_selected"],
  }).notNull(),
  token: text("token").notNull().unique(),
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
export type Client = typeof clients.$inferSelect;
export type WeeklyTemplate = typeof weeklyTemplates.$inferSelect;
export type TemplateSlot = typeof templateSlots.$inferSelect;
export type AppliedWeek = typeof appliedWeeks.$inferSelect;
export type Slot = typeof slots.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type RecurringPreference = typeof recurringPreferences.$inferSelect;
export type ChangeRequest = typeof changeRequests.$inferSelect;
export type LastMinuteInterest = typeof lastMinuteInterests.$inferSelect;
