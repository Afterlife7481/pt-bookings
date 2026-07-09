"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { SheetModal } from "@/components/SheetModal";
import { MarkSessionPaidModal } from "@/app/dashboard/components/MarkSessionPaidModal";
import { TrainerChangeSessionSection } from "@/app/dashboard/components/TrainerChangeSessionSection";
import {
  SESSION_PAYMENT_TYPES,
  formatSlotLabel,
  parseLocalDateTime,
  type SessionPaymentType,
} from "@/lib/constants";
import { getPaymentStatus } from "@/lib/payments";
import type { TrainerBookingDetail } from "@/lib/services/bookings";
import type { ScheduleEntry } from "@/lib/services/schedule-types";
import { cn, formatSessionPrice } from "@/lib/utils";

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
  const [detail, setDetail] = useState<TrainerBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [showChangeSlots, setShowChangeSlots] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to load session");
      setDetail(null);
      return;
    }
    setDetail(data);
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchUpdates(body: Record<string, unknown>): Promise<boolean> {
    if (!bookingId) return false;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      return false;
    }
    setDetail(data);
    await onChanged();
    return true;
  }

  async function confirmMarkPaid(paymentType: SessionPaymentType) {
    const ok = await patchUpdates({ sessionPaid: true, paymentType });
    if (ok) setShowPaidModal(false);
  }

  async function runAction(
    action: "cancel" | "send_confirmation" | "send_invoice" | "void",
  ) {
    if (!bookingId) return;
    setBusy(true);
    setError(null);
    if (action === "send_invoice") setInvoiceError(null);

    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      const message = data.error ?? "Action failed";
      if (action === "send_invoice") setInvoiceError(message);
      else setError(message);
      return;
    }

    if (action === "cancel") {
      await onChanged();
      onClose();
      return;
    }

    setDetail(data);
    await onChanged();
  }

  async function cancelSession() {
    if (!window.confirm("Cancel this session? The slot will become available again.")) {
      return;
    }
    await runAction("cancel");
  }

  async function voidSession() {
    if (
      !window.confirm(
        "Void this session? It will be marked as if it did not take place. This cannot be undone.",
      )
    ) {
      return;
    }
    await runAction("void");
  }

  const booking = detail?.booking;
  const client = detail?.client;
  const sessionStartAt = detail?.slot?.startAt ?? booking?.sessionStartAt ?? entry.startAt;
  const isPast = parseLocalDateTime(sessionStartAt).getTime() < Date.now();
  const isInactive =
    booking?.status === "canceled" || booking?.status === "voided";
  const paymentStatus = booking ? getPaymentStatus(booking) : "unpaid";
  const sessionPageHref = bookingId
    ? `/dashboard/sessions/${bookingId}?from=schedule`
    : "/dashboard/sessions";

  return (
    <>
      <SheetModal
        title={entry.booking?.clientName ?? "Booked session"}
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
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-slate-500">Client: </span>
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {client.name}
                </Link>
              </p>
              {entry.location && (
                <p>
                  <span className="text-slate-500">Location: </span>
                  <span className="font-medium text-slate-900">
                    {entry.location.name}
                  </span>
                </p>
              )}
              <p>
                <span className="text-slate-500">Price: </span>
                <span className="font-medium text-slate-900">
                  {formatSessionPrice(client.sessionPrice)}
                </span>
              </p>
              <div className="pt-1">
                <PaymentStatusBadge
                  sessionPaid={booking.sessionPaid}
                  invoiceSentAt={booking.invoiceSentAt}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {!isInactive && (
              <section className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-medium text-slate-900">Payment</h3>
                <div className="flex shrink-0 self-start rounded-lg border border-slate-200 p-0.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchUpdates({ sessionPaid: false })}
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
                    disabled={busy}
                    onClick={() => {
                      if (paymentStatus !== "paid") setShowPaidModal(true);
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

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void patchUpdates({ paymentType: null })}
                    className={cn(
                      "min-w-0 rounded-lg border px-3 py-2 text-sm font-medium transition",
                      booking.paymentType == null
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    Not set
                  </button>
                  {SESSION_PAYMENT_TYPES.map((option) => {
                    const selected = booking.paymentType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void patchUpdates({ paymentType: option.value })
                        }
                        className={cn(
                          "min-w-0 rounded-lg border px-3 py-2 text-sm font-medium transition",
                          selected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="secondary"
                  disabled={
                    busy ||
                    client.sessionPrice == null ||
                    !detail.paymentDetailsReady
                  }
                  className="w-full"
                  onClick={() => void runAction("send_invoice")}
                >
                  {booking.invoiceSentAt ? "Resend invoice" : "Send invoice"}
                </Button>
                {invoiceError && (
                  <p className="text-sm text-red-600">{invoiceError}</p>
                )}
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
                        variant="secondary"
                        disabled={busy}
                        className="w-full"
                        onClick={() => void runAction("send_confirmation")}
                      >
                        Send WhatsApp confirmation
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

      {detail && (
        <MarkSessionPaidModal
          open={showPaidModal}
          busy={busy}
          initialPaymentType={detail.booking.paymentType}
          onClose={() => setShowPaidModal(false)}
          onConfirm={confirmMarkPaid}
        />
      )}
    </>
  );
}
