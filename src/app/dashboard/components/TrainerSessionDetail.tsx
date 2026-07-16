"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { SendInvoiceChannelSheet } from "@/components/SendInvoiceChannelSheet";
import { SessionWhen } from "@/components/SessionWhen";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { isWallClockPast, wallClockToUtcMs } from "@/lib/zoned-time";
import { useTrainerSettings } from "../hooks/useTrainerSettings";
import { TrainerChangeSessionSection } from "./TrainerChangeSessionSection";
import {
  SessionPaymentModals,
  SessionPaymentSection,
} from "./SessionPaymentSection";
import { useTrainerBookingActions } from "../hooks/useTrainerBookingActions";
import {
  cn,
  formatDurationMinutes,
} from "@/lib/utils";

export function TrainerSessionDetail({
  bookingId,
  backHref = "/dashboard/sessions",
  backLabel = "← Back to sessions",
}: {
  bookingId: string;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  const { settings } = useTrainerSettings();
  const timeZone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const [saved, setSaved] = useState(false);
  const [showChangeSlots, setShowChangeSlots] = useState(false);

  const {
    detail,
    setDetail,
    loading,
    notFound,
    busy,
    error,
    invoiceError,
    invoiceNotice,
    confirmationError,
    confirmationNotice,
    showPaidModal,
    setShowPaidModal,
    paidModalMode,
    showInvoiceSheet,
    setShowInvoiceSheet,
    showConfirmationSheet,
    setShowConfirmationSheet,
    patchUpdates,
    confirmPaymentMethod,
    openMarkPaidModal,
    openEditPaymentMethodModal,
    openInvoiceSheet,
    openConfirmationSheet,
    sendInvoice,
    sendConfirmation,
    cancelSession,
    voidSession,
  } = useTrainerBookingActions(bookingId, {
    treat404AsNotFound: true,
    onCanceled: () => {
      router.push(backHref);
      router.refresh();
    },
  });

  async function patchAndMarkSaved(body: Record<string, unknown>) {
    const ok = await patchUpdates(body);
    if (ok) setSaved(true);
    return ok;
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading session…</p>;
  }

  if (notFound || !detail) {
    return (
      <div className="space-y-4">
        <Link
          href={backHref}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          {backLabel}
        </Link>
        <Card>
          <p className="text-slate-600">Session not found.</p>
        </Card>
      </div>
    );
  }

  const { booking, slot, client, location } = detail;
  const sessionStartAt = slot?.startAt ?? booking.sessionStartAt;
  const sessionEndAt = slot?.endAt ?? null;
  const isCanceled = booking.status === "canceled";
  const isVoided = booking.status === "voided";
  const isInactive = isCanceled || isVoided;
  const isPast = isWallClockPast(sessionStartAt, timeZone);
  const durationMinutes =
    sessionEndAt != null
      ? Math.round(
          (wallClockToUtcMs(sessionEndAt, timeZone) -
            wallClockToUtcMs(sessionStartAt, timeZone)) /
            60_000,
        )
      : 60;
  const clientSessionUrl = booking.sessionUrl;

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="min-w-0">
        <Link
          href={backHref}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          {backLabel}
        </Link>
        <SessionWhen
          startAt={sessionStartAt}
          endAt={sessionEndAt}
          variant="header"
          className="mt-2"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {isCanceled ? (
            <Badge tone="danger">Canceled</Badge>
          ) : isVoided ? (
            <Badge tone="danger">Voided</Badge>
          ) : booking.status === "pending_change" ? (
            <Badge tone="warning">Changing</Badge>
          ) : isPast ? (
            <>
              <Badge>Past</Badge>
              {booking.isRecurring ? (
                <Badge tone="success">Recurring</Badge>
              ) : (
                <Badge>Manual</Badge>
              )}
            </>
          ) : booking.isRecurring ? (
            <Badge tone="success">Recurring</Badge>
          ) : (
            <Badge>Manual</Badge>
          )}
          {!isInactive && (
            <PaymentStatusBadge
              sessionPaid={booking.sessionPaid}
              invoiceSentAt={booking.invoiceSentAt}
            />
          )}
        </div>
      </div>

      <div
        className="relative h-5 text-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {error ? (
          <p className="absolute inset-0 truncate text-red-600">{error}</p>
        ) : (
          <p
            className={cn(
              "absolute inset-0 text-green-700 transition-opacity duration-150",
              saved ? "opacity-100" : "opacity-0",
            )}
          >
            Changes saved.
          </p>
        )}
      </div>

      <Card className="min-w-0">
        <h2 className="font-semibold">Session details</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Client</dt>
            <dd className="font-medium">
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="text-blue-600 hover:underline"
              >
                {client.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Duration</dt>
            <dd>{formatDurationMinutes(durationMinutes)}</dd>
          </div>
          {location && (
            <div>
              <dt className="text-slate-500">Location</dt>
              <dd>{location.name}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card className="min-w-0">
        <h2 className="font-semibold">Payment</h2>
        <SessionPaymentSection
          detail={detail}
          busy={busy}
          disabled={isInactive}
          variant="card"
          showSetupHints
          invoiceError={invoiceError}
          invoiceNotice={invoiceNotice}
          onPatch={patchAndMarkSaved}
          onOpenMarkPaid={openMarkPaidModal}
          onOpenEditPaymentMethod={openEditPaymentMethodModal}
          onOpenInvoiceSheet={openInvoiceSheet}
        />
      </Card>

      {!isInactive && (
        <Card className="min-w-0">
          <h2 className="font-semibold">Manage session</h2>
          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {isPast ? (
                <>
                  <Button
                    variant="secondary"
                    disabled
                    className="w-full sm:w-auto"
                  >
                    Send confirmation
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy}
                    className="w-full sm:w-auto"
                    onClick={() => void voidSession()}
                  >
                    Void session
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    className="w-full sm:w-auto"
                    onClick={() => setShowChangeSlots((open) => !open)}
                  >
                    Change slot
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    className="w-full sm:w-auto"
                    onClick={openConfirmationSheet}
                  >
                    Send confirmation
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy}
                    className="w-full sm:w-auto"
                    onClick={() => void cancelSession()}
                  >
                    Cancel session
                  </Button>
                </>
              )}
            </div>
            {!isPast && confirmationNotice && (
              <p className="text-sm text-green-700" role="status">
                {confirmationNotice}
              </p>
            )}
            {!isPast && confirmationError && !showConfirmationSheet && (
              <p className="text-sm text-red-600" role="alert">
                {confirmationError}
              </p>
            )}
            {!isPast && booking.confirmationSentAt && (
              <p className="text-sm text-slate-500">
                Last sent on{" "}
                {new Date(booking.confirmationSentAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                .
              </p>
            )}
            {!isPast && showChangeSlots && (
              <TrainerChangeSessionSection
                bookingId={bookingId}
                disabled={busy}
                onChanged={setDetail}
                onClose={() => setShowChangeSlots(false)}
              />
            )}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {isPast
              ? "This session has already taken place. Use Payment above to record payment or send an invoice. Void only if the session should not count (e.g. booked in error)."
              : "Use Change slot to move this session. The client is notified when the time changes."}
          </p>
        </Card>
      )}

      {isVoided && (
        <Card className="min-w-0">
          <p className="text-sm text-slate-600">
            This session was voided and no longer counts as a completed booking.
          </p>
        </Card>
      )}

      <Card className="min-w-0">
        <h2 className="font-semibold">Client link</h2>
        <p className="mt-2 text-sm text-slate-600">
          Share this link with your client so they can view, change, or cancel
          their session.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={clientSessionUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Open client session page
          </a>
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() => {
              void navigator.clipboard.writeText(clientSessionUrl);
              setSaved(true);
            }}
          >
            Copy link
          </Button>
        </div>
      </Card>

      <SessionPaymentModals
        detail={detail}
        busy={busy}
        invoiceError={invoiceError}
        showPaidModal={showPaidModal}
        paidModalMode={paidModalMode}
        showInvoiceSheet={showInvoiceSheet}
        onClosePaidModal={() => setShowPaidModal(false)}
        onCloseInvoiceSheet={() => setShowInvoiceSheet(false)}
        onConfirmPaymentMethod={async (paymentType) => {
          const ok = await confirmPaymentMethod(paymentType);
          if (ok) setSaved(true);
        }}
        onSendInvoice={sendInvoice}
      />

      {showConfirmationSheet ? (
        <SendInvoiceChannelSheet
          clientName={client.name}
          email={client.email}
          phone={client.phone}
          preferredNotifyChannel={client.preferredNotifyChannel}
          busy={busy}
          error={confirmationError}
          title="Send confirmation"
          subtitle={`Choose how to send the session confirmation to ${client.name}.`}
          onClose={() => {
            if (!busy) setShowConfirmationSheet(false);
          }}
          onSend={sendConfirmation}
        />
      ) : null}
    </div>
  );
}
