import { describe, expect, it } from "vitest";
import {
  digitsForWhatsApp,
  normalizeClientPhone,
  validateWhatsAppPhone,
  whatsappClickToChatUrl,
} from "@/lib/whatsapp-link";

describe("digitsForWhatsApp", () => {
  it("keeps E.164-style numbers as digits", () => {
    expect(digitsForWhatsApp("+44 7700 901101")).toBe("447700901101");
  });

  it("converts UK local mobiles to country code", () => {
    expect(digitsForWhatsApp("07700901101")).toBe("447700901101");
  });

  it("strips international 00 prefix", () => {
    expect(digitsForWhatsApp("00447700901101")).toBe("447700901101");
  });

  it("returns null for empty or invalid values", () => {
    expect(digitsForWhatsApp("")).toBeNull();
    expect(digitsForWhatsApp("not-a-phone")).toBeNull();
    expect(digitsForWhatsApp("123")).toBeNull();
  });
});

describe("validateWhatsAppPhone", () => {
  it("accepts valid numbers", () => {
    expect(validateWhatsAppPhone("+447700901101")).toEqual({
      ok: true,
      digits: "447700901101",
      e164: "+447700901101",
    });
  });

  it("warns when phone is missing", () => {
    const result = validateWhatsAppPhone("  ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/no phone number/i);
    }
  });

  it("warns when phone cannot be used with WhatsApp", () => {
    const result = validateWhatsAppPhone("12345");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/add or check/i);
    }
  });
});

describe("normalizeClientPhone", () => {
  it("stores E.164", () => {
    expect(normalizeClientPhone("07700901101")).toBe("+447700901101");
  });

  it("throws for invalid phones", () => {
    expect(() => normalizeClientPhone("abc")).toThrow(/add or check/i);
  });
});

describe("whatsappClickToChatUrl", () => {
  it("builds a wa.me URL with encoded text", () => {
    const url = whatsappClickToChatUrl(
      "+447700901101",
      "Hi Casey, your session is booked: https://example.com/s/abc",
    );
    expect(url).toBe(
      "https://wa.me/447700901101?text=Hi%20Casey%2C%20your%20session%20is%20booked%3A%20https%3A%2F%2Fexample.com%2Fs%2Fabc",
    );
  });

  it("returns null when phone is not usable", () => {
    expect(whatsappClickToChatUrl("trainer@example.com", "hello")).toBeNull();
  });
});
