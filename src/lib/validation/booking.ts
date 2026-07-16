import { DEFAULT_CURRENCY } from "@/lib/currency";
import { parseSessionPriceInput } from "@/lib/utils";

/** Parse session price for a booking PATCH body (minor-unit integer or major-unit string). */
export function bookingSessionPriceFromBody(
  value: unknown,
  currency: string = DEFAULT_CURRENCY,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("Session price must be zero or greater");
    }
    return value;
  }
  if (typeof value === "string") {
    return parseSessionPriceInput(value, currency);
  }
  throw new Error("Invalid session price");
}
