"use client";

import { useParams } from "next/navigation";
import { ClientNotesSection } from "@/components/ClientNotesSection";
import { ClientPageHeader } from "../../ClientPageHeader";
import { useClientSubpage } from "../../useClientSubpage";

export default function ClientPublicNotesPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { client, loading, notFound } = useClientSubpage(clientId);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (notFound || !client) {
    return (
      <div className="space-y-4">
        <ClientPageHeader backHref="/dashboard/clients" backLabel="Clients" />
        <p className="text-slate-600">Client not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientPageHeader
        title="Public notes"
        clientName={client.name}
        backHref={`/dashboard/clients/${clientId}`}
        backLabel={client.name}
      />
      <ClientNotesSection
        clientId={clientId}
        visibility="shared"
        showHeading={false}
      />
    </div>
  );
}
