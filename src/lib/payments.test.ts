import { describe, expect, it } from "vitest";
import { getPaymentStatus, paymentStatusLabel } from "@/lib/payments";

describe("getPaymentStatus", () => {
  it("returns paid when sessionPaid is true", () => {
    expect(
      getPaymentStatus({ sessionPaid: true, invoiceSentAt: "2026-01-01T12:00:00" }),
    ).toBe("paid");
  });

  it("returns requested when unpaid but invoice was sent", () => {
    expect(
      getPaymentStatus({ sessionPaid: false, invoiceSentAt: "2026-01-01T12:00:00" }),
    ).toBe("requested");
  });

  it("returns unpaid when no payment recorded", () => {
    expect(getPaymentStatus({ sessionPaid: false, invoiceSentAt: null })).toBe(
      "unpaid",
    );
  });
});

describe("paymentStatusLabel", () => {
  it("labels each status", () => {
    expect(paymentStatusLabel("unpaid")).toBe("Unpaid");
    expect(paymentStatusLabel("requested")).toBe("Requested");
    expect(paymentStatusLabel("paid")).toBe("Paid");
  });
});
