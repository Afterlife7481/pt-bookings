"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import {
  RecurringWeekCalendar,
  slotKey,
  parseSlotKey,
  type RecurringSlotAssignment,
} from "@/components/RecurringWeekCalendar";
import { formatSlot, formatCreatedDate, sessionPriceToInput } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";
import { clientHomeUrl } from "@/lib/constants";

type ClientBooking = {
  id: string;
  token: string;
  status: string;
  override36h: boolean;
  isRecurring: boolean;
  sessionStartAt: string;
  slotStartAt: string;
};

type ClientLocationOption = {
  id: string;
  name: string;
  enabled: boolean;
};

type ClientDetail = {
  id: string;
  token: string;
  name: string;
  email: string;
  phone: string;
  lastMinuteOptIn: boolean;
  sessionPrice: number | null;
  createdAt: string;
  recurringPreferences: { dayOfWeek: number; startTime: string }[];
  locations: ClientLocationOption[];
  bookings: ClientBooking[];
};

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sessionPrice, setSessionPrice] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSaved, setDetailsSaved] = useState(false);

  const [recurringAssignments, setRecurringAssignments] = useState<
    RecurringSlotAssignment[]
  >([]);
  const [scheduleStartTime, setScheduleStartTime] = useState("07:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("21:00");
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(new Set());
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);

  const [enabledLocationIds, setEnabledLocationIds] = useState<Set<string>>(new Set());
  const [savingLocations, setSavingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [bookingActionError, setBookingActionError] = useState<string | null>(null);

  const mounted = useMounted();

  const loadClient = useCallback(async () => {
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
    setClient(data);
    setName(data.name);
    setEmail(data.email);
    setPhone(data.phone);
    setSessionPrice(sessionPriceToInput(data.sessionPrice));
    setEnabledLocationIds(
      new Set(data.locations.filter((l) => l.enabled).map((l) => l.id)),
    );
    setLoading(false);
    return data;
  }, [clientId]);

  const loadRecurringOptions = useCallback(
    async (prefs: { dayOfWeek: number; startTime: string }[]) => {
      setLoadingOptions(true);
      setRecurringError(null);
      const res = await fetch(`/api/clients/${clientId}/recurring-options`);
      const data: {
        assignments: RecurringSlotAssignment[];
        scheduleStartTime: string;
        scheduleEndTime: string;
      } = await res.json();
      setRecurringAssignments(data.assignments);
      setScheduleStartTime(data.scheduleStartTime);
      setScheduleEndTime(data.scheduleEndTime);
      setSelectedSlotKeys(
        new Set(prefs.map((p) => slotKey(p.dayOfWeek, p.startTime))),
      );
      setLoadingOptions(false);
    },
    [clientId],
  );

  useEffect(() => {
    loadClient().then((data) => {
      if (data) loadRecurringOptions(data.recurringPreferences);
    });
  }, [loadClient, loadRecurringOptions]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsError(null);
    setDetailsSaved(false);

    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, sessionPrice }),
    });
    const data = await res.json();
    setSavingDetails(false);

    if (!res.ok) {
      setDetailsError(data.error ?? "Failed to save");
      return;
    }

    setClient(data);
    setDetailsSaved(true);
  }

  async function sendSessionWhatsApp(bookingId: string) {
    setBusyBookingId(bookingId);
    setBookingActionError(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_confirmation", bookingId }),
    });
    const data = await res.json();
    setBusyBookingId(null);
    if (!res.ok) {
      setBookingActionError(data.error ?? "Failed to send WhatsApp");
      return;
    }
    await loadClient();
  }

  async function cancelSession(bookingId: string) {
    if (!window.confirm("Cancel this session?")) return;
    setBusyBookingId(bookingId);
    setBookingActionError(null);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", bookingId }),
    });
    const data = await res.json();
    setBusyBookingId(null);
    if (!res.ok) {
      setBookingActionError(data.error ?? "Failed to cancel session");
      return;
    }
    await loadClient();
  }

  function toggleSlot(dayOfWeek: number, startTime: string) {
    const key = slotKey(dayOfWeek, startTime);
    const assignment = recurringAssignments.find(
      (a) => slotKey(a.dayOfWeek, a.startTime) === key,
    );
    if (assignment && !assignment.isCurrentClient) return;

    setSelectedSlotKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveRecurringSlots(slots: { dayOfWeek: number; startTime: string }[]) {
    setSavingRecurring(true);
    setRecurringError(null);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recurringSlots: slots }),
    });
    const data = await res.json();
    setSavingRecurring(false);

    if (!res.ok) {
      setRecurringError(data.error ?? "Failed to save");
      return;
    }

    setClient(data);
    loadRecurringOptions(data.recurringPreferences);
  }

  async function toggleLocation(locationId: string, enabled: boolean) {
    const next = new Set(enabledLocationIds);
    if (enabled) next.add(locationId);
    else next.delete(locationId);
    setEnabledLocationIds(next);

    setSavingLocations(true);
    setLocationsError(null);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationIds: [...next] }),
    });
    const data = (await res.json()) as ClientDetail | { error?: string };
    setSavingLocations(false);

    if (!res.ok) {
      setLocationsError(
        "error" in data ? (data.error ?? "Failed to save locations") : "Failed to save locations",
      );
      if (client) {
        setEnabledLocationIds(
          new Set(client.locations.filter((l) => l.enabled).map((l) => l.id)),
        );
      }
      return;
    }

    setClient(data as ClientDetail);
    setEnabledLocationIds(
      new Set(
        (data as ClientDetail).locations
          .filter((l) => l.enabled)
          .map((l) => l.id),
      ),
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-slate-500">Loading client…</p>
      </main>
    );
  }

  if (notFound || !client) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 p-6">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to dashboard
        </Link>
        <Card>
          <p className="text-slate-600">Client not found.</p>
        </Card>
      </main>
    );
  }

  const now = mounted ? Date.now() : null;
  const upcoming =
    now === null
      ? []
      : client.bookings.filter(
          (b) =>
            b.status !== "canceled" &&
            new Date(b.slotStartAt).getTime() >= now,
        );
  const history =
    now === null
      ? client.bookings
      : client.bookings.filter(
          (b) =>
            b.status === "canceled" ||
            new Date(b.slotStartAt).getTime() < now,
        );

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{client.name}</h1>
        <p className="text-sm text-slate-500">Client profile</p>
      </div>

      <Card>
        <h2 className="font-semibold">Details</h2>
        <form onSubmit={saveDetails} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Name</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Email</span>
              <input
                type="email"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Phone</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Session price (£)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={sessionPrice}
                onChange={(e) => setSessionPrice(e.target.value)}
                placeholder="50.00"
              />
            </label>
          </div>

          <p className="text-sm text-slate-500">
            Last-minute alerts are managed by the client from their portal link.
          </p>

          {detailsError && <p className="text-sm text-red-600">{detailsError}</p>}
          {detailsSaved && (
            <p className="text-sm text-green-700">Client details saved.</p>
          )}

          <Button type="submit" disabled={savingDetails}>
            {savingDetails ? "Saving…" : "Save details"}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">Client portal link</p>
          <a
            className="mt-1 inline-block break-all text-sm text-blue-600 underline"
            href={clientHomeUrl(client.token)}
            target="_blank"
            rel="noreferrer"
          >
            {clientHomeUrl(client.token)}
          </a>
          <p className="mt-2 text-xs text-slate-400">
            Added {formatCreatedDate(client.createdAt)}
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Locations</h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose which of your training locations are available for this client.
        </p>

        {client.locations.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No locations yet. Add locations in the{" "}
            <Link href="/dashboard" className="text-blue-600 underline">
              Settings
            </Link>{" "}
            tab on the dashboard.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {client.locations.map((location) => (
              <li key={location.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={enabledLocationIds.has(location.id)}
                    disabled={savingLocations}
                    onChange={(e) => toggleLocation(location.id, e.target.checked)}
                  />
                  <span>{location.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {locationsError && (
          <p className="mt-3 text-sm text-red-600">{locationsError}</p>
        )}
        {savingLocations && (
          <p className="mt-3 text-sm text-slate-500">Saving locations…</p>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">Recurring slots</h2>
        <p className="mt-1 text-sm text-slate-600">
          Click any hour to assign recurring sessions. Slots assigned to another client are unavailable.
        </p>
        {selectedSlotKeys.size > 0 && (
          <p className="mt-2 text-sm font-medium text-slate-700">
            {selectedSlotKeys.size} slot{selectedSlotKeys.size === 1 ? "" : "s"} selected
          </p>
        )}
        {recurringError && (
          <p className="mt-3 text-sm text-red-600">{recurringError}</p>
        )}
        {loadingOptions ? (
          <p className="mt-4 text-sm text-slate-500">Loading schedule…</p>
        ) : (
          <RecurringWeekCalendar
            assignments={recurringAssignments}
            selectedSlotKeys={selectedSlotKeys}
            onToggle={toggleSlot}
            scheduleStartTime={scheduleStartTime}
            scheduleEndTime={scheduleEndTime}
          />
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={savingRecurring}
            onClick={() =>
              saveRecurringSlots([...selectedSlotKeys].map(parseSlotKey))
            }
          >
            Save recurring slots
          </Button>
          {(client.recurringPreferences.length > 0 || selectedSlotKeys.size > 0) && (
            <Button
              variant="secondary"
              disabled={savingRecurring}
              onClick={() => {
                setSelectedSlotKeys(new Set());
                saveRecurringSlots([]);
              }}
            >
              Clear all
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Upcoming sessions</h2>
        {bookingActionError && (
          <p className="mt-2 text-sm text-red-600">{bookingActionError}</p>
        )}
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No upcoming sessions.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {upcoming.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium">{formatSlot(b.slotStartAt)}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge>{b.status}</Badge>
                    {b.isRecurring && <Badge>Recurring</Badge>}
                    {b.override36h && <Badge tone="warning">36h override</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    disabled={busyBookingId === b.id}
                    onClick={() => sendSessionWhatsApp(b.id)}
                  >
                    {busyBookingId === b.id ? "Sending…" : "Send WhatsApp"}
                  </Button>
                  <Button
                    variant="danger"
                    className="px-3 py-1.5 text-xs"
                    disabled={busyBookingId === b.id}
                    onClick={() => cancelSession(b.id)}
                  >
                    Cancel session
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {history.length > 0 && (
        <Card>
          <h2 className="font-semibold">History</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {history.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium">{formatSlot(b.slotStartAt)}</p>
                  <Badge>{b.status}</Badge>
                </div>
                {b.status !== "canceled" && (
                  <a
                    className="text-sm text-blue-600 underline"
                    href={`/s/${b.token}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Session link
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
