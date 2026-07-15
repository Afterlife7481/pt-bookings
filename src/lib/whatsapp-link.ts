/**
 * Build a WhatsApp click-to-chat URL so the trainer can send from their own number.
 * https://wa.me/<digits>?text=...
 */

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

/** Click-to-chat URL, or null when the phone cannot be used with WhatsApp. */
export function whatsappClickToChatUrl(
  phone: string,
  text: string,
): string | null {
  const digits = digitsForWhatsApp(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Open WhatsApp with a pre-filled message (trainer taps Send). */
export function openWhatsAppClickToChat(phone: string, text: string): boolean {
  const url = whatsappClickToChatUrl(phone, text);
  if (!url || typeof window === "undefined") return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
