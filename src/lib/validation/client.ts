import { parseSessionPriceInput } from "@/lib/utils";

export function sessionPriceFromBody(
  value: unknown,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Session price must be zero or greater");
    }
    return Math.round(value * 100);
  }
  if (typeof value === "string") {
    return parseSessionPriceInput(value);
  }
  throw new Error("Invalid session price");
}
