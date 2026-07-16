"use client";

import { useCallback, useEffect, useState } from "react";
import type { TrainerBookingDetail } from "@/lib/services/bookings";
import type { NotifyChannel } from "@/lib/notify-channels";
import {
  prepareWhatsAppOpen,
  prepareWhatsAppOpenForPhone,
} from "@/lib/whatsapp-link";

type PaidModalMode = "mark" | "edit";

type Options = {
  /** Called after a successful mutation that should refresh parent data. */
  onChanged?: () => void | Promise<void>;
  /** Called after a successful cancel (e.g. close modal or navigate away). */
  onCanceled?: () => void;
  /** When true, a 404 sets `notFound` instead of a generic error. */
  treat404AsNotFound?: boolean;
};

export function useTrainerBookingActions(
  bookingId: string | undefined,
  options: Options = {},
) {
  const { onChanged, onCanceled, treat404AsNotFound = false } = options;

  const [detail, setDetail] = useState<TrainerBookingDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(bookingId));
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceNotice, setInvoiceNotice] = useState<string | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null,
  );
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(
    null,
  );
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [paidModalMode, setPaidModalMode] = useState<PaidModalMode>("mark");
  const [showInvoiceSheet, setShowInvoiceSheet] = useState(false);
  const [showConfirmationSheet, setShowConfirmationSheet] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) {
      setLoading(false);
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (treat404AsNotFound && res.status === 404) {
        setNotFound(true);
        setDetail(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error ?? "Failed to load session");
        setDetail(null);
        return;
      }
      setNotFound(false);
      setDetail(data);
    } catch {
      setLoading(false);
      setError("Failed to load session");
      setDetail(null);
    }
  }, [bookingId, treat404AsNotFound]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchUpdates = useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      if (!bookingId) return false;
      setBusy(true);
      setError(null);
      try {
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
        await onChanged?.();
        return true;
      } catch {
        setBusy(false);
        setError("Failed to save");
        return false;
      }
    },
    [bookingId, onChanged],
  );

  const confirmPaymentMethod = useCallback(
    async (paymentType: string) => {
      const ok = await patchUpdates(
        paidModalMode === "edit"
          ? { paymentType }
          : { sessionPaid: true, paymentType },
      );
      if (ok) setShowPaidModal(false);
      return ok;
    },
    [paidModalMode, patchUpdates],
  );

  function openMarkPaidModal() {
    setPaidModalMode("mark");
    setShowPaidModal(true);
  }

  function openEditPaymentMethodModal() {
    setPaidModalMode("edit");
    setShowPaidModal(true);
  }

  function openInvoiceSheet() {
    setInvoiceError(null);
    setInvoiceNotice(null);
    setShowInvoiceSheet(true);
  }

  function openConfirmationSheet() {
    setConfirmationError(null);
    setConfirmationNotice(null);
    setShowConfirmationSheet(true);
  }

  const runAction = useCallback(
    async (
      action: "cancel" | "void",
    ): Promise<Record<string, unknown> | null> => {
      if (!bookingId) return null;

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
          return null;
        }

        if (action === "cancel") {
          await onChanged?.();
          onCanceled?.();
          return data;
        }

        setDetail(data);
        await onChanged?.();
        return data;
      } catch {
        setBusy(false);
        setError("Action failed");
        return null;
      }
    },
    [bookingId, onCanceled, onChanged],
  );

  const sendConfirmation = useCallback(
    async (channels: NotifyChannel[]) => {
      if (!bookingId) return;
      const wantWhatsApp = channels.includes("whatsapp");
      let waOpen: ReturnType<typeof prepareWhatsAppOpen> | null = null;
      if (wantWhatsApp) {
        const prepared = prepareWhatsAppOpenForPhone(detail?.client.phone);
        if (!prepared.ok) {
          setConfirmationError(prepared.error);
          return;
        }
        waOpen = prepared.opener;
      }

      setBusy(true);
      setConfirmationError(null);
      setConfirmationNotice(null);
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send_confirmation", channels }),
        });
        const data = await res.json();
        setBusy(false);
        if (!res.ok) {
          waOpen?.finish(null);
          setConfirmationError(data.error ?? "Failed to send confirmation");
          return;
        }

        setDetail(data);
        setShowConfirmationSheet(false);
        if (wantWhatsApp) {
          if (
            typeof data.whatsappUrl === "string" &&
            data.whatsappUrl.length > 0
          ) {
            waOpen?.finish(data.whatsappUrl);
          } else {
            waOpen?.finish(null);
            setConfirmationError(
              "Confirmation logged, but WhatsApp could not open. Check the client phone number.",
            );
            return;
          }
        }
        const via = Array.isArray(data.sentVia)
          ? (data.sentVia as string[]).join(" and ")
          : channels.join(" and ");
        setConfirmationNotice(`Confirmation sent via ${via}.`);
        await onChanged?.();
      } catch {
        waOpen?.finish(null);
        setBusy(false);
        setConfirmationError("Failed to send confirmation");
      }
    },
    [bookingId, detail?.client.phone, onChanged],
  );

  const sendInvoice = useCallback(
    async (channels: NotifyChannel[]) => {
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
        await onChanged?.();
      } catch {
        waOpen?.finish(null);
        setBusy(false);
        setInvoiceError("Failed to send invoice");
      }
    },
    [bookingId, detail?.client.phone, onChanged],
  );

  async function cancelSession() {
    if (
      !window.confirm(
        "Cancel this session? The slot will become available again.",
      )
    ) {
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

  return {
    detail,
    setDetail,
    loading,
    notFound,
    busy,
    error,
    setError,
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
    load,
    patchUpdates,
    confirmPaymentMethod,
    openMarkPaidModal,
    openEditPaymentMethodModal,
    openInvoiceSheet,
    openConfirmationSheet,
    runAction,
    sendInvoice,
    sendConfirmation,
    cancelSession,
    voidSession,
  };
}
