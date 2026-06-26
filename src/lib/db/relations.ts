import { relations } from "drizzle-orm";
import {
  trainers,
  clients,
  weeklyTemplates,
  templateSlots,
  appliedWeeks,
  slots,
  bookings,
  recurringPreferences,
  changeRequests,
  lastMinuteInterests,
  whatsappMessages,
} from "./schema";

export const trainersRelations = relations(trainers, ({ many }) => ({
  clients: many(clients),
  templates: many(weeklyTemplates),
  appliedWeeks: many(appliedWeeks),
  slots: many(slots),
  bookings: many(bookings),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  trainer: one(trainers, {
    fields: [clients.trainerId],
    references: [trainers.id],
  }),
  bookings: many(bookings),
  recurringPreferences: many(recurringPreferences),
  lastMinuteInterests: many(lastMinuteInterests),
}));

export const weeklyTemplatesRelations = relations(
  weeklyTemplates,
  ({ one, many }) => ({
    trainer: one(trainers, {
      fields: [weeklyTemplates.trainerId],
      references: [trainers.id],
    }),
    slots: many(templateSlots),
    appliedWeeks: many(appliedWeeks),
  }),
);

export const templateSlotsRelations = relations(templateSlots, ({ one }) => ({
  template: one(weeklyTemplates, {
    fields: [templateSlots.templateId],
    references: [weeklyTemplates.id],
  }),
}));

export const appliedWeeksRelations = relations(appliedWeeks, ({ one, many }) => ({
  trainer: one(trainers, {
    fields: [appliedWeeks.trainerId],
    references: [trainers.id],
  }),
  template: one(weeklyTemplates, {
    fields: [appliedWeeks.templateId],
    references: [weeklyTemplates.id],
  }),
  slots: many(slots),
}));

export const slotsRelations = relations(slots, ({ one, many }) => ({
  appliedWeek: one(appliedWeeks, {
    fields: [slots.appliedWeekId],
    references: [appliedWeeks.id],
  }),
  booking: one(bookings),
  lastMinuteInterests: many(lastMinuteInterests),
  changeRequestsFrom: many(changeRequests, { relationName: "fromSlot" }),
  changeRequestsTo: many(changeRequests, { relationName: "toSlot" }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  slot: one(slots, {
    fields: [bookings.slotId],
    references: [slots.id],
  }),
  client: one(clients, {
    fields: [bookings.clientId],
    references: [clients.id],
  }),
  changeRequests: many(changeRequests),
}));

export const recurringPreferencesRelations = relations(
  recurringPreferences,
  ({ one }) => ({
    client: one(clients, {
      fields: [recurringPreferences.clientId],
      references: [clients.id],
    }),
  }),
);

export const changeRequestsRelations = relations(changeRequests, ({ one }) => ({
  booking: one(bookings, {
    fields: [changeRequests.bookingId],
    references: [bookings.id],
  }),
  fromSlot: one(slots, {
    fields: [changeRequests.fromSlotId],
    references: [slots.id],
    relationName: "fromSlot",
  }),
  toSlot: one(slots, {
    fields: [changeRequests.toSlotId],
    references: [slots.id],
    relationName: "toSlot",
  }),
}));

export const lastMinuteInterestsRelations = relations(
  lastMinuteInterests,
  ({ one }) => ({
    slot: one(slots, {
      fields: [lastMinuteInterests.slotId],
      references: [slots.id],
    }),
    client: one(clients, {
      fields: [lastMinuteInterests.clientId],
      references: [clients.id],
    }),
  }),
);

export const whatsappMessagesRelations = relations(
  whatsappMessages,
  ({ one }) => ({
    client: one(clients, {
      fields: [whatsappMessages.clientId],
      references: [clients.id],
    }),
  }),
);
