/**
 * Build a WhatsApp click-to-chat URL so the trainer can send from their own number.
 * https://wa.me/<digits>?text=...
 */

export const WHATSAPP_PHONE_HINT =
  "Mobile number with country code, e.g. +447700900000 (UK mobiles can also use 07…).";

export const WHATSAPP_PHONE_ERROR =
  "Add or check this client's phone number before sending on WhatsApp. Use a mobile with country code (e.g. +447…).";

export type WhatsAppPhoneResult =
  | { ok: true; digits: string; e164: string }
  | { ok: false; error: string };

/** Digits only, suitable for wa.me (no +). Returns null if unusable. */
export function digitsForWhatsApp(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Common UK mobile entered without country code: 07xxx → 447xxx
  if (digits.length === 11 && digits.startsWith("07")) {
    digits = `44${digits.slice(1)}`;
  }

  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** Validate a client phone for WhatsApp click-to-chat. */
export function validateWhatsAppPhone(
  phone: string | null | undefined,
): WhatsAppPhoneResult {
  const trimmed = (phone ?? "").trim();
  if (!trimmed) {
    return {
      ok: false,
      error:
        "This client has no phone number. Add one on their profile, then try again.",
    };
  }

  const digits = digitsForWhatsApp(trimmed);
  if (!digits) {
    return { ok: false, error: WHATSAPP_PHONE_ERROR };
  }

  return { ok: true, digits, e164: `+${digits}` };
}

/** Throws with a trainer-facing message when the phone cannot be used with WhatsApp. */
export function assertWhatsAppPhone(phone: string | null | undefined): {
  digits: string;
  e164: string;
} {
  const result = validateWhatsAppPhone(phone);
  if (!result.ok) throw new Error(result.error);
  return { digits: result.digits, e164: result.e164 };
}

/** Normalise a client phone to E.164 (+digits) or throw. */
export function normalizeClientPhone(phone: string): string {
  return assertWhatsAppPhone(phone).e164;
}

/** Click-to-chat URL, or null when the phone cannot be used with WhatsApp. */
export function whatsappClickToChatUrl(
  phone: string,
  text: string,
): string | null {
  const digits = digitsForWhatsApp(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export type WhatsAppOpenHandle = {
  /** Navigate to the wa.me URL, or close the placeholder tab if null. */
  finish: (url: string | null | undefined) => void;
};

/**
 * Call synchronously inside the click handler (before any `await`).
 * Browsers block `window.open` after async work; opening a blank tab first
 * keeps the gesture so WhatsApp can open once the API returns the URL.
 */
export function prepareWhatsAppOpen(): WhatsAppOpenHandle {
  if (typeof window === "undefined") {
    return { finish: () => undefined };
  }

  const popup = window.open("about:blank", "_blank");

  return {
    finish(url) {
      if (!url) {
        popup?.close();
        return;
      }
      if (popup && !popup.closed) {
        try {
          popup.location.href = url;
          return;
        } catch {
          // Fall through to same-tab navigation.
        }
      }
      // Popup blocked — leave this tab for WhatsApp (works well on mobile).
      window.location.assign(url);
    },
  };
}

/**
 * Validate phone then open a placeholder tab. Returns null when the phone is
 * invalid (no tab opened) so the caller can show `error` instead.
 */
export function prepareWhatsAppOpenForPhone(
  phone: string | null | undefined,
): { ok: true; opener: WhatsAppOpenHandle } | { ok: false; error: string } {
  const check = validateWhatsAppPhone(phone);
  if (!check.ok) return check;
  return { ok: true, opener: prepareWhatsAppOpen() };
}

/** Open WhatsApp with a pre-filled message (trainer taps Send). */
export function openWhatsAppClickToChat(phone: string, text: string): boolean {
  const url = whatsappClickToChatUrl(phone, text);
  if (!url || typeof window === "undefined") return false;
  const opener = prepareWhatsAppOpen();
  opener.finish(url);
  return true;
}
