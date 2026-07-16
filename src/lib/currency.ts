/** ISO 4217 codes trainers can select as their default charging currency. */
export const TRAINER_CURRENCY_OPTIONS = [
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
  { value: "CAD", label: "Canadian Dollar (CAD)" },
  { value: "NZD", label: "New Zealand Dollar (NZD)" },
  { value: "CHF", label: "Swiss Franc (CHF)" },
  { value: "SEK", label: "Swedish Krona (SEK)" },
  { value: "NOK", label: "Norwegian Krone (NOK)" },
  { value: "DKK", label: "Danish Krone (DKK)" },
  { value: "PLN", label: "Polish Złoty (PLN)" },
  { value: "ZAR", label: "South African Rand (ZAR)" },
  { value: "AED", label: "UAE Dirham (AED)" },
  { value: "SGD", label: "Singapore Dollar (SGD)" },
  { value: "HKD", label: "Hong Kong Dollar (HKD)" },
  { value: "INR", label: "Indian Rupee (INR)" },
  { value: "JPY", label: "Japanese Yen (JPY)" },
] as const;

export type CurrencyCode = (typeof TRAINER_CURRENCY_OPTIONS)[number]["value"];

export const DEFAULT_CURRENCY: CurrencyCode = "GBP";

const SUPPORTED_CURRENCY_SET = new Set<string>(
  TRAINER_CURRENCY_OPTIONS.map((opt) => opt.value),
);

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return SUPPORTED_CURRENCY_SET.has(value);
}

/** Normalize and validate a currency code; throws on unsupported values. */
export function normalizeCurrency(value: string): CurrencyCode {
  const code = value.trim().toUpperCase();
  if (!isSupportedCurrency(code)) {
    throw new Error("Unsupported currency");
  }
  return code;
}

export function currencyLabel(currency: string): string {
  const match = TRAINER_CURRENCY_OPTIONS.find((opt) => opt.value === currency);
  return match?.label ?? currency;
}

/** Fraction digits for a currency (0 for JPY, 2 for most others). */
export function currencyFractionDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
      }).resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/** Narrow symbol for inputs (e.g. £, €, $). Falls back to the ISO code. */
export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

/**
 * Resolve which currency applies to a price.
 * Prefer booking snapshot → client override → trainer default.
 */
export function resolveMoneyCurrency(parts: {
  bookingCurrency?: string | null;
  clientCurrency?: string | null;
  trainerCurrency?: string | null;
}): string {
  return (
    parts.bookingCurrency ||
    parts.clientCurrency ||
    parts.trainerCurrency ||
    DEFAULT_CURRENCY
  );
}

/** Format minor units as a localized currency string, or em dash when unset. */
export function formatMoney(
  minorUnits: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
): string {
  if (minorUnits == null) return "—";
  const digits = currencyFractionDigits(currency);
  const major = minorUnits / 10 ** digits;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(major);
  } catch {
    return `${major.toFixed(digits)} ${currency}`;
  }
}

/** Parse a major-unit input string to integer minor units, or null if empty. */
export function parseMoneyInput(
  value: string,
  currency: string = DEFAULT_CURRENCY,
): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const major = Number(trimmed);
  if (!Number.isFinite(major) || major < 0) {
    throw new Error("Session price must be zero or greater");
  }
  const digits = currencyFractionDigits(currency);
  return Math.round(major * 10 ** digits);
}

/** Minor units to a major-unit string suitable for number inputs. */
export function moneyToInput(
  minorUnits: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
): string {
  if (minorUnits == null) return "";
  const digits = currencyFractionDigits(currency);
  const major = minorUnits / 10 ** digits;
  if (digits === 0) return String(Math.round(major));
  const fixed = major.toFixed(digits);
  return fixed.replace(new RegExp(`\\.0{${digits}}$`), "");
}
