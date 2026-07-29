import { DEFAULT_CURRENCY } from "@/lib/currency";
import { formatSessionPrice } from "@/lib/utils";

export type PaymentMethodDetails = {
  name: string;
  note: string | null;
};

export type PaymentDetailsForMessage = {
  methods: PaymentMethodDetails[];
};

export function paymentDetailsFromMethods(
  methods: PaymentMethodDetails[],
): PaymentDetailsForMessage {
  return { methods };
}

export function hasPaymentDetailsForInvoice(
  details: PaymentDetailsForMessage,
): boolean {
  return details.methods.length > 0;
}

/** Payment lines for invoices — lists each method with its optional note. */
export function formatPaymentOptionsText(
  details: PaymentDetailsForMessage,
): string {
  if (details.methods.length === 0) return "";

  return details.methods
    .map((method) => {
      const note = method.note?.trim();
      return note ? `${method.name}\n${note}` : method.name;
    })
    .join("\n\n");
}

export function formatInvoiceAmount(
  minorUnits: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  return formatSessionPrice(minorUnits, currency);
}

export type PaymentStatus = "unpaid" | "requested" | "paid";

export function getPaymentStatus(booking: {
  sessionPaid: boolean;
  invoiceSentAt: string | null;
}): PaymentStatus {
  if (booking.sessionPaid) return "paid";
  if (booking.invoiceSentAt) return "requested";
  return "unpaid";
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "requested":
      return "Requested";
    case "unpaid":
      return "Unpaid";
  }
}

export function paymentStatusBadgeTone(
  status: PaymentStatus,
): "default" | "success" | "warning" {
  switch (status) {
    case "paid":
      return "success";
    case "requested":
      return "warning";
    case "unpaid":
      return "default";
  }
}
