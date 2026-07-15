"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import { SessionWhen } from "@/components/SessionWhen";
import {
  parseLocalDateTime,
  sessionPaymentTypeLabel,
} from "@/lib/constants";
import type { TrainerBookingDetail } from "@/lib/services/bookings";
import { getPaymentStatus } from "@/lib/payments";
import { TrainerChangeSessionSection } from "./TrainerChangeSessionSection";
import { MarkSessionPaidModal } from "./MarkSessionPaidModal";
import { SessionPriceEditor } from "./SessionPriceEditor";
import {
  cn,
  formatDurationMinutes,
  resolveBookingSessionPrice,
} from "@/lib/utils";
import { prepareWhatsAppOpen, prepareWhatsAppOpenForPhone } from "@/lib/whatsapp-link";
import { SendInvoiceChannelSheet } from "@/components/SendInvoiceChannelSheet";
import type { NotifyChannel } from "@/lib/notify-channels";

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
  const [detail, setDetail] = useState<TrainerBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState(false);
  const [showChangeSlots, setShowChangeSlots] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [paidModalMode, setPaidModalMode] = useState<"mark" | "edit">("mark");
  const [showInvoiceSheet, setShowInvoiceSheet] = useState(false);
  const [invoiceNotice, setInvoiceNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/bookings/${bookingId}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load session");
      setLoading(false);
      return;
    }
    setDetail(data);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    load().catch(() => {
      setError("Failed to load session");
      setLoading(false);
    });
  }, [load]);

  async function patchUpdates(body: Record<string, unknown>): Promise<boolean> {
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
    setSaved(true);
    return true;
  }

  async function confirmPaymentMethod(paymentType: string) {
    const ok = await patchUpdates(
      paidModalMode === "edit"
        ? { paymentType }
        : { sessionPaid: true, paymentType },
    );
    if (ok) {
      setShowPaidModal(false);
    }
  }

  function openMarkPaidModal() {
    setPaidModalMode("mark");
    setShowPaidModal(true);
  }

  function openEditPaymentMethodModal() {
    setPaidModalMode("edit");
    setShowPaidModal(true);
  }

  async function runAction(
    action: "cancel" | "send_confirmation" | "void",
  ) {
    let waOpen: ReturnType<typeof prepareWhatsAppOpen> | null = null;
    if (action === "send_confirmation") {
      const prepared = prepareWhatsAppOpenForPhone(detail?.client.phone);
      if (!prepared.ok) {
        setError(prepared.error);
        return;
      }
      waOpen = prepared.opener;
    }

    setBusy(true);
    setError(null);
    setConfirmationNotice(false);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) {
        waOpen?.finish(null);
        setError(data.error ?? "Action failed");
        return;
      }
      if (action === "cancel") {
        router.push(backHref);
        router.refresh();
        return;
      }
      if (action === "send_confirmation") {
        setDetail(data);
        setConfirmationNotice(true);
        waOpen?.finish(data.whatsappUrl);
        return;
      }
      if (action === "void") {
        setDetail(data);
        return;
      }
      setSaved(true);
    } catch {
      waOpen?.finish(null);
      setBusy(false);
      setError("Action failed");
    }
  }

  async function sendInvoice(channels: NotifyChannel[]) {
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
  const isPast =
    parseLocalDateTime(sessionStartAt).getTime() < Date.now();
  const durationMinutes =
    sessionEndAt != null
      ? Math.round(
          (parseLocalDateTime(sessionEndAt).getTime() -
            parseLocalDateTime(sessionStartAt).getTime()) /
            60_000,
        )
      : 60;
  const paymentStatus = getPaymentStatus(booking);
  const effectiveSessionPrice = resolveBookingSessionPrice(
    booking.sessionPrice,
    client.sessionPrice,
  );
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
        <div className="mt-4 space-y-4">
          <SessionPriceEditor
            sessionPrice={booking.sessionPrice}
            clientDefaultPrice={client.sessionPrice}
            disabled={busy || isInactive}
            onSave={async (sessionPrice) => {
              const ok = await patchUpdates({ sessionPrice });
              if (ok) setSaved(true);
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">Payment status</p>
              <p className="text-sm text-slate-500">
                Send an invoice to move from unpaid to requested.
              </p>
            </div>
            <div className="flex shrink-0 self-start rounded-lg border border-slate-200 p-0.5">
              <button
                type="button"
                disabled={busy || isInactive}
                onClick={() => patchUpdates({ sessionPaid: false })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  paymentStatus === "unpaid"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Unpaid
              </button>
              <button
                type="button"
                disabled
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  paymentStatus === "requested"
                    ? "bg-slate-900 text-white"
                    : "text-slate-400"
                }`}
              >
                Requested
              </button>
              <button
                type="button"
                disabled={busy || isInactive}
                onClick={() => {
                  if (paymentStatus !== "paid") {
                    openMarkPaidModal();
                  }
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  paymentStatus === "paid"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Paid
              </button>
            </div>
          </div>

          {paymentStatus === "paid" && (
            <div>
              <p className="text-sm font-medium text-slate-900">
                Payment method
              </p>
              <button
                type="button"
                disabled={busy || isInactive}
                onClick={openEditPaymentMethodModal}
                className="mt-2 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              >
                {sessionPaymentTypeLabel(booking.paymentType)}
              </button>
              <p className="mt-1 text-xs text-slate-500">
                Tap to change payment method.
              </p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              Send the session amount and your bank payment details by email,
              WhatsApp, or both.
            </p>
            {booking.invoiceSentAt && (
              <p className="mt-1 text-sm text-slate-500">
                Last sent{" "}
                {new Date(booking.invoiceSentAt).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                .
              </p>
            )}
            <Button
              variant="secondary"
              disabled={
                busy ||
                isInactive ||
                effectiveSessionPrice == null ||
                !detail.paymentDetailsReady
              }
              className="mt-3 w-full sm:w-auto"
              onClick={() => {
                setInvoiceError(null);
                setInvoiceNotice(null);
                setShowInvoiceSheet(true);
              }}
            >
              {booking.invoiceSentAt ? "Resend invoice" : "Send invoice"}
            </Button>
            {invoiceNotice && (
              <p className="mt-2 text-sm text-green-700" role="status">
                {invoiceNotice}
              </p>
            )}
            {effectiveSessionPrice == null && !isInactive && (
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
            )}
            {effectiveSessionPrice != null &&
              !detail.paymentDetailsReady &&
              !isInactive && (
                <p className="mt-2 text-sm text-amber-700">
                  Add bank account and sort code in{" "}
                  <Link
                    href="/dashboard/settings"
                    className="underline hover:text-amber-900"
                  >
                    Settings → Payment details
                  </Link>{" "}
                  before sending an invoice.
                </p>
              )}
            {invoiceError && (
              <p className="mt-2 text-sm text-red-600">{invoiceError}</p>
            )}
          </div>
        </div>
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
                  onClick={voidSession}
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
                  onClick={() => runAction("send_confirmation")}
                >
                  Send confirmation
                </Button>
                <Button
                  variant="danger"
                  disabled={busy}
                  className="w-full sm:w-auto"
                  onClick={cancelSession}
                >
                  Cancel session
                </Button>
              </>
            )}
            </div>
            {!isPast && confirmationNotice && (
              <p className="text-sm text-green-700" role="status">
                WhatsApp opened — tap Send to deliver the confirmation.
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

      <MarkSessionPaidModal
        open={showPaidModal}
        busy={busy}
        mode={paidModalMode}
        paymentMethods={detail.paymentMethods}
        initialPaymentType={booking.paymentType}
        onClose={() => setShowPaidModal(false)}
        onConfirm={confirmPaymentMethod}
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
            if (!busy) setShowInvoiceSheet(false);
          }}
          onSend={sendInvoice}
        />
      ) : null}
    </div>
  );
}
