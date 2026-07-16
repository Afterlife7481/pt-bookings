"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";
import { ClientLocationsSection } from "../../../components/ClientLocationsSection";
import { ClientPageHeader } from "../ClientPageHeader";
import type { ClientDetail } from "../client-types";

export default function ClientLocationsPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [clientName, setClientName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data: ClientDetail = await res.json();
    setClientName(data.name);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (notFound || !clientName) {
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
        title="Locations"
        clientName={clientName}
        backHref={`/dashboard/clients/${clientId}`}
        backLabel={clientName}
      />
      <ClientLocationsSection clientId={clientId} showHeading={false} />
    </div>
  );
}
