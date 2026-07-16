"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { SendInvoiceChannelSheet } from "@/components/SendInvoiceChannelSheet";
import {
  prepareWhatsAppOpen,
  prepareWhatsAppOpenForPhone,
} from "@/lib/whatsapp-link";
import type { NotifyChannel } from "@/lib/notify-channels";
import { ClientPageHeader } from "../ClientPageHeader";
import { useClientSubpage } from "../useClientSubpage";

export default function ClientPortalPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { client, loading, notFound } = useClientSubpage(clientId);

  const [showPortalSheet, setShowPortalSheet] = useState(false);
  const [sendingPortal, setSendingPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalNotice, setPortalNotice] = useState<string | null>(null);

  async function sendPortalLink(channels: NotifyChannel[]) {
    if (!client) return;
    const wantWhatsApp = channels.includes("whatsapp");
    let waOpen: ReturnType<typeof prepareWhatsAppOpen> | null = null;
    if (wantWhatsApp) {
      const prepared = prepareWhatsAppOpenForPhone(client.phone);
      if (!prepared.ok) {
        setPortalError(prepared.error);
        return;
      }
      waOpen = prepared.opener;
    }

    setSendingPortal(true);
    setPortalError(null);
    setPortalNotice(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/portal-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels }),
      });
      const data = await res.json();
      setSendingPortal(false);
      if (!res.ok) {
        waOpen?.finish(null);
        setPortalError(data.error ?? "Failed to send portal link");
        return;
      }

      setShowPortalSheet(false);
      if (wantWhatsApp) {
        if (
          typeof data.whatsappUrl === "string" &&
          data.whatsappUrl.length > 0
        ) {
          waOpen?.finish(data.whatsappUrl);
        } else {
          waOpen?.finish(null);
          setPortalError(
            "Portal link logged, but WhatsApp could not open. Check the client phone number.",
          );
          return;
        }
      }

      const via = Array.isArray(data.sentVia)
        ? data.sentVia.join(" and ")
        : channels.join(" and ");
      setPortalNotice(`Portal link sent via ${via}.`);
    } catch {
      waOpen?.finish(null);
      setSendingPortal(false);
      setPortalError("Failed to send portal link");
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (notFound || !client) {
    return (
      <div className="space-y-4">
        <ClientPageHeader backHref="/dashboard/clients" backLabel="Clients" />
        <Card>
          <p className="text-slate-600">Client not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientPageHeader
        title="Client portal"
        clientName={client.name}
        backHref={`/dashboard/clients/${clientId}`}
        backLabel={client.name}
      />

      <Card>
        <p className="text-sm text-slate-600">
          Share this link so the client can view sessions, book, and manage
          bookings.
        </p>
        <a
          className="mt-3 inline-block break-all text-sm text-blue-600 underline"
          href={client.portalUrl}
          target="_blank"
          rel="noreferrer"
        >
          {client.portalUrl}
        </a>
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setPortalError(null);
              setShowPortalSheet(true);
            }}
          >
            Send to client
          </Button>
        </div>
        {portalNotice && (
          <p className="mt-2 text-sm text-green-700">{portalNotice}</p>
        )}
        {portalError && !showPortalSheet && (
          <p className="mt-2 text-sm text-red-600">{portalError}</p>
        )}
      </Card>

      {showPortalSheet && (
        <SendInvoiceChannelSheet
          clientName={client.name}
          email={client.email}
          phone={client.phone}
          preferredNotifyChannel={client.preferredNotifyChannel}
          busy={sendingPortal}
          error={portalError}
          title="Send portal link"
          subtitle={`Choose how to send the portal link to ${client.name}.`}
          onClose={() => {
            if (!sendingPortal) setShowPortalSheet(false);
          }}
          onSend={sendPortalLink}
        />
      )}
    </div>
  );
}
