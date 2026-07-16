import { describe, expect, it } from "vitest";
import {
  currencyFractionDigits,
  currencySymbol,
  formatMoney,
  moneyToInput,
  normalizeCurrency,
  parseMoneyInput,
  resolveMoneyCurrency,
} from "./currency";

describe("currency helpers", () => {
  it("formats GBP minor units", () => {
    expect(formatMoney(3500, "GBP")).toBe("£35.00");
    expect(formatMoney(null, "GBP")).toBe("—");
  });

  it("formats EUR and USD", () => {
    expect(formatMoney(5000, "EUR")).toContain("50");
    expect(formatMoney(5000, "USD")).toContain("50");
  });

  it("parses major units to minor units", () => {
    expect(parseMoneyInput("35", "GBP")).toBe(3500);
    expect(parseMoneyInput("49.50", "GBP")).toBe(4950);
    expect(parseMoneyInput("", "GBP")).toBeNull();
  });

  it("handles zero-decimal currencies", () => {
    expect(currencyFractionDigits("JPY")).toBe(0);
    expect(parseMoneyInput("5000", "JPY")).toBe(5000);
    expect(moneyToInput(5000, "JPY")).toBe("5000");
    expect(formatMoney(5000, "JPY")).toContain("5,000");
  });

  it("converts minor units back to input strings", () => {
    expect(moneyToInput(5000, "GBP")).toBe("50");
    expect(moneyToInput(4950, "GBP")).toBe("49.50");
  });

  it("resolves currency booking → client → trainer", () => {
    expect(
      resolveMoneyCurrency({
        bookingCurrency: "EUR",
        clientCurrency: "USD",
        trainerCurrency: "GBP",
      }),
    ).toBe("EUR");
    expect(
      resolveMoneyCurrency({
        bookingCurrency: null,
        clientCurrency: "USD",
        trainerCurrency: "GBP",
      }),
    ).toBe("USD");
    expect(
      resolveMoneyCurrency({
        bookingCurrency: null,
        clientCurrency: null,
        trainerCurrency: "GBP",
      }),
    ).toBe("GBP");
    expect(resolveMoneyCurrency({})).toBe("GBP");
  });

  it("normalizes and validates currency codes", () => {
    expect(normalizeCurrency(" eur ")).toBe("EUR");
    expect(() => normalizeCurrency("XXX")).toThrow("Unsupported currency");
  });

  it("returns a symbol for inputs", () => {
    expect(currencySymbol("GBP")).toBe("£");
  });
});
