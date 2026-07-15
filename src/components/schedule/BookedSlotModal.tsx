"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { SheetModal } from "@/components/SheetModal";
import { MarkSessionPaidModal } from "@/app/dashboard/components/MarkSessionPaidModal";
import { TrainerChangeSessionSection } from "@/app/dashboard/components/TrainerChangeSessionSection";
import {
  formatSlotLabel,
  parseLocalDateTime,
  sessionPaymentTypeLabel,
} from "@/lib/constants";
import { getPaymentStatus } from "@/lib/payments";
import type { TrainerBookingDetail } from "@/lib/services/bookings";
import type { ScheduleEntry } from "@/lib/services/schedule-types";
import { SessionPriceEditor } from "@/app/dashboard/components/SessionPriceEditor";
import { cn, resolveBookingSessionPrice } from "@/lib/utils";
import { prepareWhatsAppOpen, prepareWhatsAppOpenForPhone } from "@/lib/whatsapp-link";
import { SendInvoiceChannelSheet } from "@/components/SendInvoiceChannelSheet";
import type { NotifyChannel } from "@/lib/notify-channels";

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
  const [paidModalMode, setPaidModalMode] = useState<"mark" | "edit">("mark");
  const [showInvoiceSheet, setShowInvoiceSheet] = useState(false);
  const [invoiceNotice, setInvoiceNotice] = useState<string | null>(null);

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

  async function confirmPaymentMethod(paymentType: string) {
    const ok = await patchUpdates(
      paidModalMode === "edit"
        ? { paymentType }
        : { sessionPaid: true, paymentType },
    );
    if (ok) setShowPaidModal(false);
  }

  function openMarkPaidModal() {
    setPaidModalMode("mark");
    setShowPaidModal(true);
  }

  function openEditPaymentMethodModal() {
    setPaidModalMode("edit");
    setShowPaidModal(true);
  }

  async function runAction(action: "cancel" | "void") {
    if (!bookingId) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }

      if (action === "cancel") {
        await onChanged();
        onClose();
        return;
      }

      setDetail(data);
      await onChanged();
    } catch {
      setBusy(false);
      setError("Action failed");
    }
  }

  async function sendInvoice(channels: NotifyChannel[]) {
    if (!bookingId) return;
    const wantWhatsApp = channels.includes("whatsapp");
    let waOpen: ReturnType<typeof prepareWhatsAppOpen> | null = null;
    if (wantWhatsApp) {
      const prepared = prepareWhatsAppOpenForPhone(detail?.client.phone);
      if (!prepared.ok) {
        setInvoiceError(prepared.error);
        return;
      }
      waOpen = prepared.opener;
    }

    setBusy(true);
    setInvoiceError(null);
    setInvoiceNotice(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_invoice", channels }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) {
        waOpen?.finish(null);
        setInvoiceError(data.error ?? "Failed to send invoice");
        return;
      }

      setDetail(data);
      setShowInvoiceSheet(false);
      if (wantWhatsApp) {
        if (
          typeof data.whatsappUrl === "string" &&
          data.whatsappUrl.length > 0
        ) {
          waOpen?.finish(data.whatsappUrl);
        } else {
          waOpen?.finish(null);
          setInvoiceError(
            "Invoice logged, but WhatsApp could not open. Check the client phone number.",
          );
        }
      }
      const via = Array.isArray(data.sentVia)
        ? (data.sentVia as string[]).join(" and ")
        : channels.join(" and ");
      setInvoiceNotice(`Invoice sent via ${via}.`);
      await onChanged();
    } catch {
      waOpen?.finish(null);
      setBusy(false);
      setInvoiceError("Failed to send invoice");
    }
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
  const effectiveSessionPrice =
    booking && client
      ? resolveBookingSessionPrice(booking.sessionPrice, client.sessionPrice)
      : null;
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
                <SessionPriceEditor
                  sessionPrice={booking.sessionPrice}
                  clientDefaultPrice={client.sessionPrice}
                  disabled={busy}
                  onSave={async (sessionPrice) => {
                    await patchUpdates({ sessionPrice });
                  }}
                />
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
                      if (paymentStatus !== "paid") openMarkPaidModal();
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

                {paymentStatus === "paid" && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Payment method
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={openEditPaymentMethodModal}
                      className="mt-1 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {sessionPaymentTypeLabel(booking.paymentType)}
                    </button>
                  </div>
                )}

                <Button
                  variant="secondary"
                  disabled={
                    busy ||
                    effectiveSessionPrice == null ||
                    !detail.paymentDetailsReady
                  }
                  className="w-full"
                  onClick={() => {
                    setInvoiceError(null);
                    setInvoiceNotice(null);
                    setShowInvoiceSheet(true);
                  }}
                >
                  {booking.invoiceSentAt ? "Resend invoice" : "Send invoice"}
                </Button>
                {invoiceNotice ? (
                  <p className="text-sm text-green-700" role="status">
                    {invoiceNotice}
                  </p>
                ) : null}
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
          mode={paidModalMode}
          paymentMethods={detail.paymentMethods}
          initialPaymentType={detail.booking.paymentType}
          onClose={() => setShowPaidModal(false)}
          onConfirm={confirmPaymentMethod}
        />
      )}

      {showInvoiceSheet && detail ? (
        <SendInvoiceChannelSheet
          clientName={detail.client.name}
          email={detail.client.email}
          phone={detail.client.phone}
          preferredNotifyChannel={detail.client.preferredNotifyChannel}
          busy={busy}
          error={invoiceError}
          onClose={() => {
            if (!busy) setShowInvoiceSheet(false);
          }}
          onSend={sendInvoice}
        />
      ) : null}
    </>
  );
}
