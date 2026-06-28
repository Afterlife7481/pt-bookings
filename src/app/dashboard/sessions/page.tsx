"use client";

import { SessionsTab } from "../components/SessionsTab";
import { useSessionsPage } from "../hooks/useSessionsPage";

export default function SessionsPage() {
  const { bookings, loading } = useSessionsPage();

  if (loading) {
    return <p className="text-sm text-slate-500">Loading sessions…</p>;
  }

  return <SessionsTab bookings={bookings} />;
}
