"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { SessionWhen } from "@/components/SessionWhen";
import {
  SESSION_PAYMENT_TYPES,
  bookingUrl,
  parseLocalDateTime,
} from "@/lib/constants";
import type { TrainerBookingDetail } from "@/lib/services/bookings";
import { TrainerChangeSessionSection } from "./TrainerChangeSessionSection";
import {
  cn,
  formatDurationMinutes,
  formatSessionPrice,
} from "@/lib/utils";

export function TrainerSessionDetail({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<TrainerBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showChangeSlots, setShowChangeSlots] = useState(false);

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

  async function patchUpdates(body: Record<string, unknown>) {
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
      return;
    }
    setDetail(data);
    setSaved(true);
  }

  async function runAction(
    action: "cancel" | "send_confirmation" | "send_invoice" | "void",
  ) {
    setBusy(true);
    setError(null);
    if (action === "send_invoice") {
      setInvoiceError(null);
    }
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      const message = data.error ?? "Action failed";
      if (action === "send_invoice") {
        setInvoiceError(message);
      } else {
        setError(message);
      }
      return;
    }
    if (action === "cancel") {
      router.push("/dashboard/sessions");
      router.refresh();
      return;
    }
    if (
      action === "send_invoice" ||
      action === "void" ||
      action === "send_confirmation"
    ) {
      setDetail(data);
      return;
    }
    setSaved(true);
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
          href="/dashboard/sessions"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← Back to sessions
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
  const clientSessionUrl = bookingUrl(booking.token);

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div className="min-w-0">
        <Link
          href="/dashboard/sessions"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← Back to sessions
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
          {booking.sessionPaid && <Badge tone="success">Paid</Badge>}
          {booking.invoiceSentAt && <Badge tone="success">Invoice sent</Badge>}
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
          <div>
            <dt className="text-slate-500">Client session price</dt>
            <dd>{formatSessionPrice(client.sessionPrice)}</dd>
          </div>
        </dl>
      </Card>

      <Card className="min-w-0">
        <h2 className="font-semibold">Payment</h2>
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">Session paid</p>
              <p className="text-sm text-slate-500">
                Mark whether this session has been paid.
              </p>
            </div>
            <div className="flex shrink-0 self-start rounded-lg border border-slate-200 p-0.5">
              <button
                type="button"
                disabled={busy || isInactive}
                onClick={() => patchUpdates({ sessionPaid: false })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  !booking.sessionPaid
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Unpaid
              </button>
              <button
                type="button"
                disabled={busy || isInactive}
                onClick={() => patchUpdates({ sessionPaid: true })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  booking.sessionPaid
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Paid
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-900">Payment type</p>
            <p className="text-sm text-slate-500">
              Select how this session was paid.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                disabled={busy || isInactive}
                onClick={() => patchUpdates({ paymentType: null })}
                className={cn(
                  "min-w-0 rounded-lg border px-3 py-2 text-sm font-medium transition",
                  booking.paymentType == null
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  (busy || isInactive) && "opacity-60",
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
                    disabled={busy || isInactive}
                    onClick={() => patchUpdates({ paymentType: option.value })}
                    className={cn(
                      "min-w-0 rounded-lg border px-3 py-2 text-sm font-medium transition",
                      selected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                      (busy || isInactive) && "opacity-60",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              Sends a WhatsApp with the session amount and your bank payment
              details from Settings.
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
                client.sessionPrice == null ||
                !detail.paymentDetailsReady
              }
              className="mt-3 w-full sm:w-auto"
              onClick={() => runAction("send_invoice")}
            >
              {booking.invoiceSentAt ? "Resend invoice" : "Send invoice"}
            </Button>
            {client.sessionPrice == null && !isInactive && (
              <p className="mt-2 text-sm text-amber-700">
                Set a session price on the{" "}
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="underline hover:text-amber-900"
                >
                  client profile
                </Link>{" "}
                before sending an invoice.
              </p>
            )}
            {client.sessionPrice != null &&
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
                  Send WhatsApp confirmation
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
                  Send WhatsApp confirmation
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
            {!isPast && booking.confirmationSentAt && (
              <p className="text-sm text-slate-500">
                Last sent{" "}
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
              : "Use Change slot to move this session. The client is notified by WhatsApp when the time changes."}
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
    </div>
  );
}
