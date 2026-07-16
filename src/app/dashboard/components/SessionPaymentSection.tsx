"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { SessionPriceEditor } from "./SessionPriceEditor";
import { MarkSessionPaidModal } from "./MarkSessionPaidModal";
import { SendInvoiceChannelSheet } from "@/components/SendInvoiceChannelSheet";
import { sessionPaymentTypeLabel } from "@/lib/constants";
import { getPaymentStatus } from "@/lib/payments";
import type { TrainerBookingDetail } from "@/lib/services/bookings";
import type { NotifyChannel } from "@/lib/notify-channels";
import { cn, resolveBookingSessionPrice } from "@/lib/utils";

type PaidModalMode = "mark" | "edit";

type SharedProps = {
  detail: TrainerBookingDetail;
  busy: boolean;
  disabled?: boolean;
  invoiceError: string | null;
  invoiceNotice: string | null;
  showPaidModal: boolean;
  paidModalMode: PaidModalMode;
  showInvoiceSheet: boolean;
  onPatch: (body: Record<string, unknown>) => Promise<boolean>;
  onOpenMarkPaid: () => void;
  onOpenEditPaymentMethod: () => void;
  onOpenInvoiceSheet: () => void;
  onClosePaidModal: () => void;
  onCloseInvoiceSheet: () => void;
  onConfirmPaymentMethod: (
    paymentType: string,
  ) => boolean | void | Promise<boolean | void>;
  onSendInvoice: (channels: NotifyChannel[]) => void | Promise<void>;
};

type SectionProps = SharedProps & {
  variant?: "card" | "compact";
  showSetupHints?: boolean;
};

export function SessionPaymentSection({
  detail,
  busy,
  disabled = false,
  variant = "card",
  showSetupHints = false,
  invoiceError,
  invoiceNotice,
  onPatch,
  onOpenMarkPaid,
  onOpenEditPaymentMethod,
  onOpenInvoiceSheet,
}: Omit<
  SectionProps,
  | "showPaidModal"
  | "paidModalMode"
  | "showInvoiceSheet"
  | "onClosePaidModal"
  | "onCloseInvoiceSheet"
  | "onConfirmPaymentMethod"
  | "onSendInvoice"
>) {
  const { booking, client, currency } = detail;
  const paymentStatus = getPaymentStatus(booking);
  const effectiveSessionPrice = resolveBookingSessionPrice(
    booking.sessionPrice,
    client.sessionPrice,
  );
  const controlsDisabled = busy || disabled;

  const statusToggle = (
    <div className="flex shrink-0 self-start rounded-lg border border-slate-200 p-0.5">
      <button
        type="button"
        disabled={controlsDisabled}
        onClick={() => void onPatch({ sessionPaid: false })}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition",
          paymentStatus === "unpaid"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:text-slate-900",
        )}
      >
        Unpaid
      </button>
      <button
        type="button"
        disabled
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition",
          paymentStatus === "requested"
            ? "bg-slate-900 text-white"
            : "text-slate-400",
        )}
      >
        Requested
      </button>
      <button
        type="button"
        disabled={controlsDisabled}
        onClick={() => {
          if (paymentStatus !== "paid") onOpenMarkPaid();
        }}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition",
          paymentStatus === "paid"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:text-slate-900",
        )}
      >
        Paid
      </button>
    </div>
  );

  const paymentMethod =
    paymentStatus === "paid" ? (
      <div>
        <p
          className={
            variant === "card"
              ? "text-sm font-medium text-slate-900"
              : "text-xs font-medium text-slate-500"
          }
        >
          Payment method
        </p>
        <button
          type="button"
          disabled={controlsDisabled}
          onClick={onOpenEditPaymentMethod}
          className="mt-1 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
        >
          {sessionPaymentTypeLabel(booking.paymentType)}
        </button>
        {variant === "card" ? (
          <p className="mt-1 text-xs text-slate-500">
            Tap to change payment method.
          </p>
        ) : null}
      </div>
    ) : null;

  return (
    <div className={variant === "card" ? "mt-4 space-y-4" : "space-y-3"}>
      <SessionPriceEditor
        sessionPrice={booking.sessionPrice}
        clientDefaultPrice={client.sessionPrice}
        currency={currency}
        disabled={controlsDisabled}
        onSave={async (sessionPrice) => {
          await onPatch({ sessionPrice });
        }}
      />

      {variant === "card" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">Payment status</p>
            <p className="text-sm text-slate-500">
              Send an invoice to move from unpaid to requested.
            </p>
          </div>
          {statusToggle}
        </div>
      ) : (
        statusToggle
      )}

      {paymentMethod}

      <div
        className={variant === "card" ? "border-t border-slate-100 pt-4" : undefined}
      >
        {variant === "card" ? (
          <>
            <p className="text-sm text-slate-500">
              Send the session amount and your bank payment details by email,
              WhatsApp, or both.
            </p>
            {booking.invoiceSentAt ? (
              <p className="mt-1 text-sm text-slate-500">
                Last sent{" "}
                {new Date(booking.invoiceSentAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                .
              </p>
            ) : null}
          </>
        ) : null}
        <Button
          variant="secondary"
          disabled={
            controlsDisabled ||
            effectiveSessionPrice == null ||
            !detail.paymentDetailsReady
          }
          className={cn("w-full", variant === "card" && "mt-3 sm:w-auto")}
          onClick={onOpenInvoiceSheet}
        >
          {booking.invoiceSentAt ? "Resend invoice" : "Send invoice"}
        </Button>
        {invoiceNotice ? (
          <p
            className={cn(
              "text-sm text-green-700",
              variant === "card" ? "mt-2" : undefined,
            )}
            role="status"
          >
            {invoiceNotice}
          </p>
        ) : null}
        {showSetupHints && effectiveSessionPrice == null && !disabled ? (
          <p className="mt-2 text-sm text-amber-700">
            Set a session price above or on the{" "}
            <Link
              href={`/dashboard/clients/${client.id}`}
              className="underline hover:text-amber-900"
            >
              client profile
            </Link>{" "}
            before sending an invoice.
          </p>
        ) : null}
        {showSetupHints &&
        effectiveSessionPrice != null &&
        !detail.paymentDetailsReady &&
        !disabled ? (
          <p className="mt-2 text-sm text-amber-700">
            Add bank account and sort code in{" "}
            <Link
              href="/dashboard/settings/payment"
              className="underline hover:text-amber-900"
            >
              Settings → Payment details
            </Link>{" "}
            before sending an invoice.
          </p>
        ) : null}
        {invoiceError ? (
          <p
            className={cn(
              "text-sm text-red-600",
              variant === "card" ? "mt-2" : undefined,
            )}
          >
            {invoiceError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Render as a sibling of any parent SheetModal so stacking stays correct. */
export function SessionPaymentModals({
  detail,
  busy,
  invoiceError,
  showPaidModal,
  paidModalMode,
  showInvoiceSheet,
  onClosePaidModal,
  onCloseInvoiceSheet,
  onConfirmPaymentMethod,
  onSendInvoice,
}: Pick<
  SharedProps,
  | "detail"
  | "busy"
  | "invoiceError"
  | "showPaidModal"
  | "paidModalMode"
  | "showInvoiceSheet"
  | "onClosePaidModal"
  | "onCloseInvoiceSheet"
  | "onConfirmPaymentMethod"
  | "onSendInvoice"
>) {
  const { booking, client } = detail;

  return (
    <>
      <MarkSessionPaidModal
        open={showPaidModal}
        busy={busy}
        mode={paidModalMode}
        paymentMethods={detail.paymentMethods}
        initialPaymentType={booking.paymentType}
        onClose={onClosePaidModal}
        onConfirm={onConfirmPaymentMethod}
      />

      {showInvoiceSheet ? (
        <SendInvoiceChannelSheet
          clientName={client.name}
          email={client.email}
          phone={client.phone}
          preferredNotifyChannel={client.preferredNotifyChannel}
          busy={busy}
          error={invoiceError}
          onClose={() => {
            if (!busy) onCloseInvoiceSheet();
          }}
          onSend={onSendInvoice}
        />
      ) : null}
    </>
  );
}
