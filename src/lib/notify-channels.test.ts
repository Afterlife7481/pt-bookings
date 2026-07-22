import { describe, expect, it } from "vitest";
import {
  canNotifyByWhatsApp,
  channelsFromInvoiceChoice,
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
  it("parses email and whatsapp", () => {
    expect(parseNotifyChannels(["email"])).toEqual(["email"]);
    expect(parseNotifyChannels(["whatsapp"])).toEqual(["whatsapp"]);
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
  it("prefers email when both contacts exist and preference is unset", () => {
    expect(
      defaultInvoiceChoice({
        preferred: null,
        canEmail: true,
        canWhatsApp: true,
      }),
    ).toBe("email");
  });

  it("uses the preferred channel when both contacts exist", () => {
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

  it("falls back to the only available channel", () => {
    expect(
      defaultInvoiceChoice({
        preferred: "email",
        canEmail: false,
        canWhatsApp: true,
      }),
    ).toBe("whatsapp");
    expect(
      defaultInvoiceChoice({
        preferred: "whatsapp",
        canEmail: true,
        canWhatsApp: false,
      }),
    ).toBe("email");
  });

  it("returns null when neither channel is available", () => {
    expect(
      defaultInvoiceChoice({
        preferred: "email",
        canEmail: false,
        canWhatsApp: false,
      }),
    ).toBeNull();
  });
});

describe("channelsFromInvoiceChoice", () => {
  it("maps a single choice to one channel", () => {
    expect(channelsFromInvoiceChoice("email")).toEqual(["email"]);
    expect(channelsFromInvoiceChoice("whatsapp")).toEqual(["whatsapp"]);
  });
});
