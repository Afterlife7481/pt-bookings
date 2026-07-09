import { parseSessionPriceInput } from "@/lib/utils";

/** Parse session price for a booking PATCH body (pence integer or pounds string). */
export function bookingSessionPriceFromBody(
  value: unknown,
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
    return parseSessionPriceInput(value);
  }
  throw new Error("Invalid session price");
}
