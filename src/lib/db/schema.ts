import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const trainers = pgTable("trainers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  timezone: text("timezone").notNull().default("Europe/London"),
  /** ISO 4217 default currency for session prices (clients may override later). */
  currency: text("currency").notNull().default("GBP"),
  scheduleStartTime: text("schedule_start_time").notNull().default("07:00"),
  scheduleEndTime: text("schedule_end_time").notNull().default("21:00"),
  scheduleDefaultView: text("schedule_default_view", { enum: ["day", "week"] })
    .notNull()
    .default("day"),
  cancelDeadlineHours: integer("cancel_deadline_hours").notNull().default(36),
  lastMinuteOfferLockHours: integer("last_minute_offer_lock_hours")
    .notNull()
    .default(1),
  clientBookingWindowWeeks: integer("client_booking_window_weeks")
    .notNull()
    .default(2),
  bankAccountNumber: text("bank_account_number"),
  bankSortCode: text("bank_sort_code"),
  bankName: text("bank_name"),
  paymentPayeeName: text("payment_payee_name"),
  regionalSettingsConfiguredAt: text("regional_settings_configured_at"),
  scheduleHoursConfiguredAt: text("schedule_hours_configured_at"),
  invitationsViewedAt: text("invitations_viewed_at"),
  createdAt: text("created_at").notNull(),
});

/** Trainer sign-in challenges (email OTP). Legacy name kept for the table. */
export const trainerMagicLinks = pgTable("trainer_magic_links", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  purpose: text("purpose", { enum: ["signup", "login"] }).notNull(),
  /** Normalized invite code captured at signup request; redeemed on verify. */
  inviteCode: text("invite_code"),
  /** Opaque challenge id (not emailed). */
  token: text("token").notNull().unique(),
  /** SHA-256 hash of the 6-digit OTP. */
  codeHash: text("code_hash"),
  attemptCount: integer("attempt_count").notNull().default(0),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull(),
});

/** Invite / referral codes. Admin seed codes have null ownerTrainerId. */
export const inviteCodes = pgTable(
  "invite_codes",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    ownerTrainerId: text("owner_trainer_id").references(() => trainers.id, {
      onDelete: "set null",
    }),
    /** null = unlimited uses. */
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    status: text("status", { enum: ["active", "disabled"] })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex("invite_codes_code_uidx").on(table.code),
    ownerIdx: index("invite_codes_owner_idx").on(table.ownerTrainerId),
  }),
);

export const inviteRedemptions = pgTable(
  "invite_redemptions",
  {
    id: text("id").primaryKey(),
    inviteCodeId: text("invite_code_id")
      .notNull()
      .references(() => inviteCodes.id, { onDelete: "cascade" }),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    trainerUnique: uniqueIndex("invite_redemptions_trainer_uidx").on(
      table.trainerId,
    ),
    codeIdx: index("invite_redemptions_code_idx").on(table.inviteCodeId),
  }),
);

export const trainerSessions = pgTable("trainer_sessions", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id),
  token: text("token").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull(),
  preferredNotifyChannel: text("preferred_notify_channel", {
    enum: ["email", "whatsapp"],
  })
    .notNull()
    .default("whatsapp"),
  lastMinuteOptIn: boolean("last_minute_opt_in").notNull().default(false),
  lastMinutePruneNotify: boolean("last_minute_prune_notify")
    .notNull()
    .default(false),
  sessionPrice: integer("session_price"),
  /** ISO 4217 override; null inherits the trainer default. */
  currency: text("currency"),
  createdAt: text("created_at").notNull(),
});

export const clientEmailVerifications = pgTable("client_email_verifications", {
  id: text("id").primaryKey(),
  clientId: text("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull(),
});

export const locations = pgTable("locations", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: text("created_at").notNull(),
});

export const trainerHolidays = pgTable(
  "trainer_holidays",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id, { onDelete: "cascade" }),
    startAt: text("start_at").notNull(),
    endAt: text("end_at").notNull(),
    label: text("label"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    trainerStartIdx: index("trainer_holidays_trainer_start_idx").on(
      table.trainerId,
      table.startAt,
    ),
  }),
);

export const scheduleConflictAlerts = pgTable(
  "schedule_conflict_alerts",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    weekStart: text("week_start").notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    locationId: text("location_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    locationName: text("location_name"),
    holidayId: text("holiday_id").references(() => trainerHolidays.id, {
      onDelete: "set null",
    }),
    holidayLabel: text("holiday_label"),
    slotLabel: text("slot_label").notNull(),
    status: text("status", {
      enum: ["open", "notified", "acknowledged"],
    })
      .notNull()
      .default("open"),
    acknowledgmentToken: text("acknowledgment_token").notNull().unique(),
    notifiedAt: text("notified_at"),
    acknowledgedAt: text("acknowledged_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    trainerIdx: index("schedule_conflict_alerts_trainer_idx").on(
      table.trainerId,
    ),
    tokenIdx: index("schedule_conflict_alerts_token_idx").on(
      table.acknowledgmentToken,
    ),
  }),
);

export const trainerPaymentMethods = pgTable(
  "trainer_payment_methods",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    trainerNameIdx: uniqueIndex("trainer_payment_methods_trainer_name_idx").on(
      table.trainerId,
      table.name,
    ),
    trainerSortIdx: index("trainer_payment_methods_trainer_sort_idx").on(
      table.trainerId,
      table.sortOrder,
    ),
  }),
);

export const clientLocations = pgTable(
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

export const weeklyTemplates = pgTable(
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

export const templateSlots = pgTable("template_slots", {
  id: text("id").primaryKey(),
  templateId: text("template_id")
    .notNull()
    .references(() => weeklyTemplates.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  locationId: text("location_id").references(() => locations.id, {
    onDelete: "set null",
  }),
});

export const appliedWeeks = pgTable(
  "applied_weeks",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id),
    weekStart: text("week_start").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    uniqueWeek: uniqueIndex("applied_weeks_trainer_week_idx").on(
      table.trainerId,
      table.weekStart,
    ),
  }),
);

export const slots = pgTable(
  "slots",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id),
    appliedWeekId: text("applied_week_id")
      .notNull()
      .references(() => appliedWeeks.id, { onDelete: "cascade" }),
    startAt: text("start_at").notNull(),
    endAt: text("end_at").notNull(),
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

export const bookings = pgTable(
  "bookings",
  {
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
      enum: ["booked", "pending_change", "canceled", "voided"],
    }).notNull(),
    override36h: boolean("override_36h").notNull().default(false),
    isRecurring: boolean("is_recurring").notNull().default(false),
    sessionPaid: boolean("session_paid").notNull().default(false),
    paymentType: text("payment_type"),
    sessionPrice: integer("session_price"),
    /** ISO 4217 snapshot at book time; null falls back via client → trainer. */
    currency: text("currency"),
    invoiceSentAt: text("invoice_sent_at"),
    confirmationSentAt: text("confirmation_sent_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    activeSlotIdx: uniqueIndex("bookings_active_slot_idx")
      .on(table.slotId)
      .where(
        sql`${table.slotId} is not null and ${table.status} <> 'canceled'`,
      ),
  }),
);

export const recurringPreferences = pgTable(
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

export const changeRequests = pgTable("change_requests", {
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

export const clientLastMinutePreferences = pgTable(
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

export const lastMinuteInterests = pgTable("last_minute_interests", {
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

export const clientNotes = pgTable(
  "client_notes",
  {
    id: text("id").primaryKey(),
    trainerId: text("trainer_id")
      .notNull()
      .references(() => trainers.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    visibility: text("visibility", { enum: ["shared", "private"] })
      .notNull()
      .default("private"),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    clientIdx: index("client_notes_client_idx").on(table.clientId),
  }),
);

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: text("id").primaryKey(),
  trainerId: text("trainer_id")
    .notNull()
    .references(() => trainers.id),
  clientId: text("client_id").references(() => clients.id),
  phone: text("phone").notNull(),
  messageType: text("message_type", {
    enum: [
      "confirmation",
      "last_minute",
      "interest_ack",
      "invoice",
      "last_minute_accepted",
      "last_minute_declined",
      "session_canceled",
      "session_changed",
      "template_conflict",
      "template_conflict_ack",
      "portal_link",
    ],
  }).notNull(),
  recipient: text("recipient", { enum: ["client", "trainer"] })
    .notNull()
    .default("client"),
  body: text("body").notNull(),
  channel: text("channel", { enum: ["whatsapp", "email"] })
    .notNull()
    .default("whatsapp"),
  status: text("status", {
    enum: ["pending", "sent", "failed"],
  }).notNull(),
  createdAt: text("created_at").notNull(),
});

export type Trainer = typeof trainers.$inferSelect;
export type TrainerMagicLink = typeof trainerMagicLinks.$inferSelect;
export type TrainerSession = typeof trainerSessions.$inferSelect;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type InviteRedemption = typeof inviteRedemptions.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type ClientEmailVerification =
  typeof clientEmailVerifications.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type TrainerHoliday = typeof trainerHolidays.$inferSelect;
export type ScheduleConflictAlert = typeof scheduleConflictAlerts.$inferSelect;
export type TrainerPaymentMethod = typeof trainerPaymentMethods.$inferSelect;
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
export type ClientNote = typeof clientNotes.$inferSelect;
export type ClientNoteVisibility = ClientNote["visibility"];
