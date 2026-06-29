import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { slots } from "@/lib/db/schema";
import { createLocation } from "@/lib/services/locations";
import { addScheduleSlot } from "@/lib/services/schedule";
import { seedTestFixtures } from "@tests/helpers/db";
import {
  DEFAULT_TRAINER_ID,
  addDays,
  formatDate,
  startOfWeekMonday,
} from "@/lib/constants";
import { GET, POST } from "./route";

describe("/api/client-book", () => {
  it("GET returns available slots for a valid client token", async () => {
    const fixtures = await seedTestFixtures();

    const response = await GET(
      new Request(
        `http://localhost/api/client-book?clientToken=${fixtures.clientToken}`,
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.slots.some((slot: { id: string }) => slot.id === fixtures.slotId)).toBe(
      true,
    );
  });

  it("GET rejects a missing client token", async () => {
    const response = await GET(new Request("http://localhost/api/client-book"));
    expect(response.status).toBe(400);
  });

  it("GET returns 404 for an unknown client token", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/client-book?clientToken=unknown-token",
      ),
    );
    expect(response.status).toBe(404);
  });

  it("POST books a slot for a valid client token", async () => {
    const fixtures = await seedTestFixtures();

    const response = await POST(
      new Request("http://localhost/api/client-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientToken: fixtures.clientToken,
          slotId: fixtures.slotId,
        }),
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.bookingId).toBeTruthy();

    const db = getDb();
    const slot = await db.query.slots.findFirst({
      where: eq(slots.id, fixtures.slotId),
    });
    expect(slot?.status).toBe("booked");
  });

  it("POST returns 400 when booking fails", async () => {
    const fixtures = await seedTestFixtures();
    const otherLocation = await createLocation(DEFAULT_TRAINER_ID, {
      name: "Restricted Gym",
    });

    const target = addDays(new Date(), 9);
    target.setHours(14, 0, 0, 0);
    const { slotId } = await addScheduleSlot(
      DEFAULT_TRAINER_ID,
      formatDate(startOfWeekMonday(target)),
      target.getDay(),
      "14:00",
      otherLocation.id,
    );

    const response = await POST(
      new Request("http://localhost/api/client-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientToken: fixtures.clientToken,
          slotId,
        }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
