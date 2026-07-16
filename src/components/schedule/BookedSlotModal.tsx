"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { SheetModal } from "@/components/SheetModal";
import { TrainerChangeSessionSection } from "@/app/dashboard/components/TrainerChangeSessionSection";
import {
  SessionPaymentModals,
  SessionPaymentSection,
} from "@/app/dashboard/components/SessionPaymentSection";
import { useTrainerBookingActions } from "@/app/dashboard/hooks/useTrainerBookingActions";
import {
  DEFAULT_TIMEZONE,
  formatSlotLabel,
} from "@/lib/constants";
import { isWallClockPast } from "@/lib/zoned-time";
import { useTrainerSettings } from "@/app/dashboard/hooks/useTrainerSettings";
import type { ScheduleEntry } from "@/lib/services/schedule-types";

export function BookedSlotModal({
  entry,
  onClose,
  onChanged,
}: {
  entry: ScheduleEntry;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const bookingId = entry.booking?.id;
  const [showChangeSlots, setShowChangeSlots] = useState(false);
  const { settings } = useTrainerSettings();
  const timeZone = settings?.timezone ?? DEFAULT_TIMEZONE;

  const {
    detail,
    setDetail,
    loading,
    busy,
    error,
    invoiceError,
    invoiceNotice,
    showPaidModal,
    setShowPaidModal,
    paidModalMode,
    showInvoiceSheet,
    setShowInvoiceSheet,
    patchUpdates,
    confirmPaymentMethod,
    openMarkPaidModal,
    openEditPaymentMethodModal,
    openInvoiceSheet,
    sendInvoice,
    cancelSession,
    voidSession,
  } = useTrainerBookingActions(bookingId, {
    onChanged,
    onCanceled: onClose,
  });

  const booking = detail?.booking;
  const client = detail?.client;
  const sessionStartAt =
    detail?.slot?.startAt ?? booking?.sessionStartAt ?? entry.startAt;
  const isPast = isWallClockPast(sessionStartAt, timeZone);
  const isInactive =
    booking?.status === "canceled" || booking?.status === "voided";
  const sessionPageHref = bookingId
    ? `/dashboard/sessions/${bookingId}?from=schedule`
    : "/dashboard/sessions";

  return (
    <>
      <SheetModal
        title={client?.name ?? entry.booking?.clientName ?? "Booked session"}
        titleHref={client ? `/dashboard/clients/${client.id}` : undefined}
        subtitle={formatSlotLabel(entry.startAt, entry.endAt)}
        onClose={onClose}
        footer={
          <Link
            href={sessionPageHref}
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50 sm:py-2"
          >
            Open full session page
          </Link>
        }
      >
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading session…</p>
        ) : !detail || !booking || !client ? (
          <p className="mt-4 text-sm text-red-600">
            {error ?? "Session not found."}
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {entry.location && (
              <p className="text-sm">
                <span className="text-slate-500">Location: </span>
                <span className="font-medium text-slate-900">
                  {entry.location.name}
                </span>
              </p>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {!isInactive && (
              <section className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-medium text-slate-900">Payment</h3>
                <SessionPaymentSection
                  detail={detail}
                  busy={busy}
                  variant="compact"
                  invoiceError={invoiceError}
                  invoiceNotice={invoiceNotice}
                  onPatch={patchUpdates}
                  onOpenMarkPaid={openMarkPaidModal}
                  onOpenEditPaymentMethod={openEditPaymentMethodModal}
                  onOpenInvoiceSheet={openInvoiceSheet}
                />
              </section>
            )}

            {!isInactive && (
              <section className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-medium text-slate-900">
                  Manage session
                </h3>
                <div className="flex flex-col gap-2">
                  {isPast ? (
                    <Button
                      variant="danger"
                      disabled={busy}
                      className="w-full"
                      onClick={() => void voidSession()}
                    >
                      Void session
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        className="w-full"
                        onClick={() => setShowChangeSlots((open) => !open)}
                      >
                        Change slot
                      </Button>
                      <Button
                        variant="danger"
                        disabled={busy}
                        className="w-full"
                        onClick={() => void cancelSession()}
                      >
                        Cancel session
                      </Button>
                    </>
                  )}
                </div>
                {!isPast && showChangeSlots && (
                  <TrainerChangeSessionSection
                    bookingId={booking.id}
                    disabled={busy}
                    onChanged={async (next) => {
                      setDetail(next);
                      await onChanged();
                    }}
                    onClose={() => setShowChangeSlots(false)}
                  />
                )}
              </section>
            )}
          </div>
        )}
      </SheetModal>

      {detail ? (
        <SessionPaymentModals
          detail={detail}
          busy={busy}
          invoiceError={invoiceError}
          showPaidModal={showPaidModal}
          paidModalMode={paidModalMode}
          showInvoiceSheet={showInvoiceSheet}
          onClosePaidModal={() => setShowPaidModal(false)}
          onCloseInvoiceSheet={() => setShowInvoiceSheet(false)}
          onConfirmPaymentMethod={confirmPaymentMethod}
          onSendInvoice={sendInvoice}
        />
      ) : null}
    </>
  );
}
