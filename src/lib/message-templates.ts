/**
 * Client-facing message template catalog and rendering helpers.
 * Trainers can override body/subject; missing overrides use these defaults.
 */

export const MESSAGE_TEMPLATE_KEYS = [
  "confirmation_email",
  "confirmation_whatsapp",
  "last_minute_email",
  "last_minute_whatsapp",
  "invoice_email",
  "invoice_whatsapp",
  "portal_link_email",
  "portal_link_whatsapp",
  "template_conflict_email",
  "template_conflict_whatsapp",
  "last_minute_prune_email",
  "last_minute_prune_whatsapp",
] as const;

export type MessageTemplateKey = (typeof MESSAGE_TEMPLATE_KEYS)[number];

export type MessageTemplateChannel = "email" | "whatsapp";

export type MessageTemplatePlaceholder = {
  name: string;
  description: string;
};

export type MessageTemplateDefinition = {
  key: MessageTemplateKey;
  label: string;
  channel: MessageTemplateChannel;
  description: string;
  hasSubject: boolean;
  defaultSubject: string | null;
  defaultBody: string;
  placeholders: MessageTemplatePlaceholder[];
};

const CLIENT_NAME: MessageTemplatePlaceholder = {
  name: "clientName",
  description: "Client's name",
};
const SLOT_LABEL: MessageTemplatePlaceholder = {
  name: "slotLabel",
  description: "Session day and time, e.g. Wed 22 Jul 09:00–10:00",
};
const BOOKING_URL: MessageTemplatePlaceholder = {
  name: "bookingUrl",
  description: "Link to the client session page",
};
const OFFER_URL: MessageTemplatePlaceholder = {
  name: "offerUrl",
  description: "Link to accept or decline the last-minute offer",
};
const LOCK_HOURS_LABEL: MessageTemplatePlaceholder = {
  name: "lockHoursLabel",
  description: "Offer window, e.g. 1 hour or 2 hours",
};
const AMOUNT: MessageTemplatePlaceholder = {
  name: "amount",
  description: "Formatted amount due",
};
const PAYMENT_DETAILS: MessageTemplatePlaceholder = {
  name: "paymentDetails",
  description: "Bank payment details block",
};
const PORTAL_URL: MessageTemplatePlaceholder = {
  name: "portalUrl",
  description: "Client portal link",
};
const REASON: MessageTemplatePlaceholder = {
  name: "reason",
  description: "Why the session could not be booked (includes parentheses)",
};
const CONFLICT_URL: MessageTemplatePlaceholder = {
  name: "conflictUrl",
  description: "Link for the client to acknowledge the clash",
};
const REMOVED_SLOTS: MessageTemplatePlaceholder = {
  name: "removedSlots",
  description: "Bullet list of removed last-minute selections",
};
const STATUS_NOTE: MessageTemplatePlaceholder = {
  name: "statusNote",
  description: "Whether the client was opted out or still has selections",
};
const PREFS_URL: MessageTemplatePlaceholder = {
  name: "prefsUrl",
  description: "Link to last-minute preferences",
};

export const MESSAGE_TEMPLATE_DEFINITIONS: MessageTemplateDefinition[] = [
  {
    key: "confirmation_email",
    label: "Session confirmation",
    channel: "email",
    description: "Sent when you notify a client about a booked session.",
    hasSubject: true,
    defaultSubject: "Your PT session on {{slotLabel}}",
    defaultBody:
      "Hi {{clientName}}, your PT session is booked for {{slotLabel}}. View details and manage your booking: {{bookingUrl}}",
    placeholders: [CLIENT_NAME, SLOT_LABEL, BOOKING_URL],
  },
  {
    key: "confirmation_whatsapp",
    label: "Session confirmation",
    channel: "whatsapp",
    description: "Sent when you notify a client about a booked session.",
    hasSubject: false,
    defaultSubject: null,
    defaultBody:
      "Hi {{clientName}}, your PT session is booked for {{slotLabel}}. View details and manage your booking: {{bookingUrl}}",
    placeholders: [CLIENT_NAME, SLOT_LABEL, BOOKING_URL],
  },
  {
    key: "last_minute_email",
    label: "Last-minute offer",
    channel: "email",
    description: "Offer a newly opened slot to an eligible client.",
    hasSubject: true,
    defaultSubject: "Last-minute PT slot available: {{slotLabel}}",
    defaultBody:
      "Hi {{clientName}}, a last-minute slot opened: {{slotLabel}}. You have {{lockHoursLabel}} to accept or decline. View offer: {{offerUrl}}",
    placeholders: [CLIENT_NAME, SLOT_LABEL, LOCK_HOURS_LABEL, OFFER_URL],
  },
  {
    key: "last_minute_whatsapp",
    label: "Last-minute offer",
    channel: "whatsapp",
    description: "Offer a newly opened slot to an eligible client.",
    hasSubject: false,
    defaultSubject: null,
    defaultBody:
      "Hi {{clientName}}, a last-minute slot opened: {{slotLabel}}. You have {{lockHoursLabel}} to accept or decline. View offer: {{offerUrl}}",
    placeholders: [CLIENT_NAME, SLOT_LABEL, LOCK_HOURS_LABEL, OFFER_URL],
  },
  {
    key: "invoice_email",
    label: "Invoice",
    channel: "email",
    description: "Payment request with your bank details.",
    hasSubject: true,
    defaultSubject: "Invoice for your PT session on {{slotLabel}}",
    defaultBody:
      "Hi {{clientName}}, please pay {{amount}} for your PT session on {{slotLabel}}.\n\n{{paymentDetails}}",
    placeholders: [CLIENT_NAME, AMOUNT, SLOT_LABEL, PAYMENT_DETAILS],
  },
  {
    key: "invoice_whatsapp",
    label: "Invoice",
    channel: "whatsapp",
    description: "Payment request with your bank details.",
    hasSubject: false,
    defaultSubject: null,
    defaultBody:
      "Hi {{clientName}}, please pay {{amount}} for your PT session on {{slotLabel}}.\n\n{{paymentDetails}}",
    placeholders: [CLIENT_NAME, AMOUNT, SLOT_LABEL, PAYMENT_DETAILS],
  },
  {
    key: "portal_link_email",
    label: "Portal link",
    channel: "email",
    description: "Share the client's personal booking portal.",
    hasSubject: true,
    defaultSubject: "Your personal training portal link",
    defaultBody:
      "Hi {{clientName}}, here is your personal training portal link. You can view sessions, book, and manage your bookings here: {{portalUrl}}",
    placeholders: [CLIENT_NAME, PORTAL_URL],
  },
  {
    key: "portal_link_whatsapp",
    label: "Portal link",
    channel: "whatsapp",
    description: "Share the client's personal booking portal.",
    hasSubject: false,
    defaultSubject: null,
    defaultBody:
      "Hi {{clientName}}, here is your personal training portal link. You can view sessions, book, and manage your bookings here: {{portalUrl}}",
    placeholders: [CLIENT_NAME, PORTAL_URL],
  },
  {
    key: "template_conflict_email",
    label: "Schedule clash",
    channel: "email",
    description:
      "Notify a recurring client when their usual session cannot be booked.",
    hasSubject: true,
    defaultSubject: "Your PT session on {{slotLabel}} cannot be booked",
    defaultBody:
      "Hi {{clientName}}, your regular PT session on {{slotLabel}} cannot be booked{{reason}}. Please confirm you have received this: {{conflictUrl}}",
    placeholders: [CLIENT_NAME, SLOT_LABEL, REASON, CONFLICT_URL],
  },
  {
    key: "template_conflict_whatsapp",
    label: "Schedule clash",
    channel: "whatsapp",
    description:
      "Notify a recurring client when their usual session cannot be booked.",
    hasSubject: false,
    defaultSubject: null,
    defaultBody:
      "Hi {{clientName}}, your regular PT session on {{slotLabel}} cannot be booked{{reason}}. Please confirm you have received this: {{conflictUrl}}",
    placeholders: [CLIENT_NAME, SLOT_LABEL, REASON, CONFLICT_URL],
  },
  {
    key: "last_minute_prune_email",
    label: "Last-minute preferences updated",
    channel: "email",
    description:
      "Sent when weekly template changes remove some of a client's last-minute selections.",
    hasSubject: true,
    defaultSubject: "Your last-minute openings were updated",
    defaultBody: [
      "Hi {{clientName}},",
      "",
      "Your trainer updated their weekly template, so some of your last-minute opening selections were removed:",
      "",
      "{{removedSlots}}",
      "",
      "{{statusNote}}",
      "",
      "Review or update your preferences: {{prefsUrl}}",
    ].join("\n"),
    placeholders: [CLIENT_NAME, REMOVED_SLOTS, STATUS_NOTE, PREFS_URL],
  },
  {
    key: "last_minute_prune_whatsapp",
    label: "Last-minute preferences updated",
    channel: "whatsapp",
    description:
      "Sent when weekly template changes remove some of a client's last-minute selections.",
    hasSubject: false,
    defaultSubject: null,
    defaultBody: [
      "Hi {{clientName}},",
      "",
      "Your trainer updated their weekly template, so some of your last-minute opening selections were removed:",
      "",
      "{{removedSlots}}",
      "",
      "{{statusNote}}",
      "",
      "Review or update your preferences: {{prefsUrl}}",
    ].join("\n"),
    placeholders: [CLIENT_NAME, REMOVED_SLOTS, STATUS_NOTE, PREFS_URL],
  },
];

/** Message types shown in settings; keys are ordered email then WhatsApp. */
export const MESSAGE_TEMPLATE_GROUPS = [
  {
    slug: "session-confirmation",
    label: "Session confirmation",
    description: "Sent when you notify a client about a booked session.",
    keys: ["confirmation_email", "confirmation_whatsapp"],
  },
  {
    slug: "last-minute-offer",
    label: "Last-minute offer",
    description: "Offer a newly opened slot to an eligible client.",
    keys: ["last_minute_email", "last_minute_whatsapp"],
  },
  {
    slug: "invoice",
    label: "Invoice",
    description: "Payment request with your bank details.",
    keys: ["invoice_email", "invoice_whatsapp"],
  },
  {
    slug: "portal-link",
    label: "Portal link",
    description: "Share the client's personal booking portal.",
    keys: ["portal_link_email", "portal_link_whatsapp"],
  },
  {
    slug: "schedule-clash",
    label: "Schedule clash",
    description:
      "Notify a recurring client when their usual session cannot be booked.",
    keys: ["template_conflict_email", "template_conflict_whatsapp"],
  },
  {
    slug: "last-minute-preferences-updated",
    label: "Last-minute preferences updated",
    description:
      "Sent when weekly template changes remove some of a client's last-minute selections.",
    keys: ["last_minute_prune_email", "last_minute_prune_whatsapp"],
  },
] as const satisfies ReadonlyArray<{
  slug: string;
  label: string;
  description: string;
  keys: readonly MessageTemplateKey[];
}>;

export type MessageTemplateGroupSlug =
  (typeof MESSAGE_TEMPLATE_GROUPS)[number]["slug"];

export type MessageTemplateGroup =
  (typeof MESSAGE_TEMPLATE_GROUPS)[number];

const DEFINITION_BY_KEY = new Map(
  MESSAGE_TEMPLATE_DEFINITIONS.map((def) => [def.key, def]),
);

const GROUP_BY_SLUG = new Map(
  MESSAGE_TEMPLATE_GROUPS.map((group) => [group.slug, group]),
);

export function isMessageTemplateKey(value: string): value is MessageTemplateKey {
  return DEFINITION_BY_KEY.has(value as MessageTemplateKey);
}

export function isMessageTemplateGroupSlug(
  value: string,
): value is MessageTemplateGroupSlug {
  return GROUP_BY_SLUG.has(value as MessageTemplateGroupSlug);
}

export function getMessageTemplateDefinition(
  key: MessageTemplateKey,
): MessageTemplateDefinition {
  const def = DEFINITION_BY_KEY.get(key);
  if (!def) throw new Error(`Unknown message template: ${key}`);
  return def;
}

export function getMessageTemplateGroup(
  slug: MessageTemplateGroupSlug,
): MessageTemplateGroup {
  const group = GROUP_BY_SLUG.get(slug);
  if (!group) throw new Error(`Unknown message template group: ${slug}`);
  return group;
}

/** Replace `{{name}}` placeholders. Unknown keys become empty strings. */
export function renderMessageTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => vars[name] ?? "");
}

export function assertValidMessageTemplateContent(params: {
  key: MessageTemplateKey;
  subject: string | null;
  body: string;
}): void {
  const def = getMessageTemplateDefinition(params.key);
  const body = params.body.trim();
  if (!body) {
    throw new Error("Message body cannot be empty");
  }
  if (def.hasSubject) {
    const subject = (params.subject ?? "").trim();
    if (!subject) {
      throw new Error("Email subject cannot be empty");
    }
  }
}
