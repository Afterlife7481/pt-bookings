import { describe, expect, it } from "vitest";
import {
  canNotifyByWhatsApp,
  defaultInvoiceChoice,
  hasClientEmail,
  parseNotifyChannels,
  parsePreferredNotifyChannel,
} from "@/lib/notify-channels";

describe("hasClientEmail", () => {
  it("accepts a basic email", () => {
    expect(hasClientEmail("client@example.com")).toBe(true);
  });

  it("rejects empty or incomplete values", () => {
    expect(hasClientEmail("")).toBe(false);
    expect(hasClientEmail("   ")).toBe(false);
    expect(hasClientEmail("not-an-email")).toBe(false);
  });
});

describe("canNotifyByWhatsApp", () => {
  it("accepts valid mobiles", () => {
    expect(canNotifyByWhatsApp("+447700901101")).toBe(true);
  });

  it("rejects missing or invalid phones", () => {
    expect(canNotifyByWhatsApp("")).toBe(false);
    expect(canNotifyByWhatsApp("123")).toBe(false);
  });
});

describe("parseNotifyChannels", () => {
  it("parses email, whatsapp, and both", () => {
    expect(parseNotifyChannels(["email"])).toEqual(["email"]);
    expect(parseNotifyChannels(["whatsapp"])).toEqual(["whatsapp"]);
    expect(parseNotifyChannels(["email", "whatsapp"])).toEqual([
      "email",
      "whatsapp",
    ]);
  });

  it("dedupes and rejects invalid input", () => {
    expect(parseNotifyChannels(["email", "email"])).toEqual(["email"]);
    expect(() => parseNotifyChannels([])).toThrow(/at least one/i);
    expect(() => parseNotifyChannels(["sms"])).toThrow(/Invalid send channel/);
  });
});

describe("parsePreferredNotifyChannel", () => {
  it("accepts email and whatsapp", () => {
    expect(parsePreferredNotifyChannel("email")).toBe("email");
    expect(parsePreferredNotifyChannel("whatsapp")).toBe("whatsapp");
  });

  it("rejects invalid values", () => {
    expect(() => parsePreferredNotifyChannel("both")).toThrow(/preference/i);
  });
});

describe("defaultInvoiceChoice", () => {
  it("uses the preferred channel when available", () => {
    expect(
      defaultInvoiceChoice({
        preferred: "email",
        canEmail: true,
        canWhatsApp: true,
      }),
    ).toBe("email");
    expect(
      defaultInvoiceChoice({
        preferred: "whatsapp",
        canEmail: true,
        canWhatsApp: true,
      }),
    ).toBe("whatsapp");
  });

  it("falls back when the preferred channel is unavailable", () => {
    expect(
      defaultInvoiceChoice({
        preferred: "email",
        canEmail: false,
        canWhatsApp: true,
      }),
    ).toBe("whatsapp");
  });
});
