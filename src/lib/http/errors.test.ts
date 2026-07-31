import { describe, expect, it } from "vitest";
import { errorResponse, HttpError } from "@/lib/http/errors";

async function bodyOf(res: Response) {
  return res.json() as Promise<{ error: string }>;
}

describe("errorResponse", () => {
  it("uses HttpError status", async () => {
    const res = errorResponse(new HttpError(409, "Slot is not available"));
    expect(res.status).toBe(409);
    expect(await bodyOf(res)).toEqual({ error: "Slot is not available" });
  });

  it("maps not-found messages to 404", async () => {
    const res = errorResponse(new Error("Booking not found"));
    expect(res.status).toBe(404);
  });

  it("maps availability conflicts to 409", async () => {
    const res = errorResponse(new Error("Selected slot is no longer available"));
    expect(res.status).toBe(409);
  });

  it("hides internal Postgres messages as 500", async () => {
    const res = errorResponse(
      new Error(
        'duplicate key value violates unique constraint "bookings_active_slot_idx"',
      ),
      "Failed to book session",
    );
    expect(res.status).toBe(500);
    expect(await bodyOf(res)).toEqual({ error: "Failed to book session" });
  });
});
