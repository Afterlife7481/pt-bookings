import { DEFAULT_CURRENCY } from "@/lib/currency";
import { parseSessionPriceInput } from "@/lib/utils";

export function sessionPriceFromBody(
  value: unknown,
  currency: string = DEFAULT_CURRENCY,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Session price must be zero or greater");
    }
    // Numbers from the client API are major units (e.g. pounds).
    return parseSessionPriceInput(String(value), currency);
  }
  if (typeof value === "string") {
    return parseSessionPriceInput(value, currency);
  }
  throw new Error("Invalid session price");
}
