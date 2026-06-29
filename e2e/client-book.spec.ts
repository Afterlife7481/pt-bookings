import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";

type E2eFixtures = {
  clientToken: string;
  clientBookSlotId: string;
  slotId: string;
};

function loadFixtures(): E2eFixtures {
  const fixturePath = path.join(__dirname, "fixtures.json");
  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8")) as Record<
    string,
    string
  >;
  return {
    clientToken: raw.clientToken,
    clientBookSlotId: raw.clientBookSlotId,
    slotId: raw.slotId,
  };
}

test.describe("Client self-book API", () => {
  test("lists slots and books via POST", async ({ request }) => {
    const fixtures = loadFixtures();

    const listRes = await request.get(
      `/api/client-book?clientToken=${fixtures.clientToken}`,
    );
    expect(listRes.ok()).toBeTruthy();
    const { slots } = await listRes.json();
    expect(slots.some((slot: { id: string }) => slot.id === fixtures.clientBookSlotId)).toBe(
      true,
    );
    expect(slots.some((slot: { id: string }) => slot.id === fixtures.slotId)).toBe(
      true,
    );

    const bookRes = await request.post("/api/client-book", {
      data: {
        clientToken: fixtures.clientToken,
        slotId: fixtures.clientBookSlotId,
      },
    });
    expect(bookRes.status()).toBe(201);
    const booking = await bookRes.json();
    expect(booking.bookingId).toBeTruthy();
  });
});
