import type { TrainerSettings } from "@/lib/services/settings";
import { formatSessionPrice } from "@/lib/utils";

export type PaymentDetailsForMessage = {
  payeeName: string;
  bankName: string | null;
  bankSortCode: string | null;
  bankAccountNumber: string | null;
};

export function getPaymentDetailsForMessage(
  settings: TrainerSettings,
): PaymentDetailsForMessage {
  return {
    payeeName: settings.paymentPayeeName?.trim() || settings.name,
    bankName: settings.bankName,
    bankSortCode: settings.bankSortCode,
    bankAccountNumber: settings.bankAccountNumber,
  };
}

export function hasBankTransferDetails(details: PaymentDetailsForMessage): boolean {
  return Boolean(details.bankSortCode && details.bankAccountNumber);
}

/** Payment lines for WhatsApp — extend when adding Stripe, Revolut, etc. */
export function formatPaymentOptionsText(details: PaymentDetailsForMessage): string {
  const lines: string[] = [`Pay to: ${details.payeeName}`];

  if (details.bankName) {
    lines.push(`Bank: ${details.bankName}`);
  }
  if (details.bankSortCode) {
    lines.push(`Sort code: ${details.bankSortCode}`);
  }
  if (details.bankAccountNumber) {
    lines.push(`Account: ${details.bankAccountNumber}`);
  }

  return lines.join("\n");
}

export function formatInvoiceAmount(pence: number): string {
  return formatSessionPrice(pence);
}
