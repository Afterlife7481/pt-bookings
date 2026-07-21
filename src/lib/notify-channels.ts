/**
 * Shared helpers for choosing how to notify a client (email / WhatsApp).
 */

import { validateWhatsAppPhone } from "@/lib/whatsapp-link";

export type NotifyChannel = "email" | "whatsapp";

/** Single preferred channel stored on the client profile. */
export type PreferredNotifyChannel = NotifyChannel;

/** Single channel selected in the send picker (never both). */
export type InvoiceChannelChoice = NotifyChannel;

export function hasClientEmail(email: string | null | undefined): boolean {
  const trimmed = (email ?? "").trim();
  if (!trimmed) return false;
  // Lightweight check — enough to enable the Email option in the UI.
  return trimmed.includes("@") && trimmed.includes(".");
}

export function canNotifyByWhatsApp(phone: string | null | undefined): boolean {
  return validateWhatsAppPhone(phone).ok;
}

export function parseNotifyChannels(raw: unknown): NotifyChannel[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Choose at least one way to send: email or WhatsApp");
  }
  const channels: NotifyChannel[] = [];
  for (const item of raw) {
    if (item === "email" || item === "whatsapp") {
      if (!channels.includes(item)) channels.push(item);
      continue;
    }
    throw new Error("Invalid send channel");
  }
  return channels;
}

export function parsePreferredNotifyChannel(
  raw: unknown,
): PreferredNotifyChannel {
  if (raw === "email" || raw === "whatsapp") return raw;
  throw new Error("Communication preference must be email or WhatsApp");
}

/**
 * Default send-picker selection.
 * Prefer email, then WhatsApp. When both contacts exist, use the client
 * profile preference (profile default is email).
 */
export function defaultInvoiceChoice(params: {
  preferred?: PreferredNotifyChannel | null;
  canEmail: boolean;
  canWhatsApp: boolean;
}): InvoiceChannelChoice | null {
  if (!params.canEmail && !params.canWhatsApp) return null;

  if (params.canEmail && params.canWhatsApp) {
    return params.preferred === "whatsapp" ? "whatsapp" : "email";
  }

  if (params.canEmail) return "email";
  return "whatsapp";
}

export function channelsFromInvoiceChoice(
  choice: InvoiceChannelChoice,
): NotifyChannel[] {
  return [choice];
}
