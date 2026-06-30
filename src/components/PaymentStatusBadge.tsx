import { Badge } from "@/components/ui";
import {
  getPaymentStatus,
  paymentStatusBadgeTone,
  paymentStatusLabel,
} from "@/lib/payments";

export function PaymentStatusBadge({
  sessionPaid,
  invoiceSentAt,
}: {
  sessionPaid: boolean;
  invoiceSentAt: string | null;
}) {
  const status = getPaymentStatus({ sessionPaid, invoiceSentAt });
  return (
    <Badge tone={paymentStatusBadgeTone(status)}>
      {paymentStatusLabel(status)}
    </Badge>
  );
}
