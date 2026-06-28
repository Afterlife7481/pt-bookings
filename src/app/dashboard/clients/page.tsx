"use client";

import { ClientsTab } from "../components/ClientsTab";
import { useClientsList } from "../hooks/useClientsList";

export default function ClientsPage() {
  const { clients, loading } = useClientsList();

  if (loading) {
    return <p className="text-sm text-slate-500">Loading clients…</p>;
  }

  return <ClientsTab clients={clients} />;
}
