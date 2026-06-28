"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { WeekScheduleCalendar } from "@/components/WeekScheduleCalendar";
import {
  CreateTemplateCard,
  TemplateCard,
  type TemplateView,
} from "@/components/TemplateEditor";
import { formatSlot, formatSessionPrice, formatDateTime } from "@/lib/utils";
import { dayOfWeekLabel } from "@/lib/schedule-grid";
import { defaultWeekStart, shiftWeekStart } from "@/lib/schedule-utils";
import type { ScheduleEntry } from "@/lib/services/schedule";

type Client = {
  id: string;
  token: string;
  name: string;
  email: string;
  phone: string;
  lastMinuteOptIn: boolean;
  sessionPrice: number | null;
  recurringPreferences: {
    dayOfWeek: number;
    startTime: string;
  }[];
};

type Template = TemplateView;

type TrainerLocation = { id: string; name: string };

type BookingRow = {
  booking: {
    id: string;
    token: string;
    status: string;
    override36h: boolean;
    isRecurring: boolean;
  };
  slot: { id: string; startAt: string; status: string };
  client: { id: string; name: string };
};

type WhatsAppRow = {
  id: string;
  phone: string;
  messageType: string;
  body: string;
  createdAt: string;
};

const NAV_TABS = [
  "Schedule",
  "Clients",
  "Sessions",
  "WhatsApp",
  "Settings",
] as const;

type NavTab = (typeof NAV_TABS)[number];
type DashboardTab = NavTab | "Templates";

type TrainerSettings = {
  scheduleStartTime: string;
  scheduleEndTime: string;
  scheduleDefaultView: "day" | "week";
  cancelDeadlineHours: number;
  lastMinuteOfferLockHours: number;
  timezone: string;
  name: string;
  email: string;
};

export default function DashboardPage() {
  const [tab, setTab] = useState<DashboardTab>("Schedule");
  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [scheduleRange, setScheduleRange] = useState({ weekStart: "", weekEnd: "" });
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [whatsapp, setWhatsapp] = useState<WhatsAppRow[]>([]);
  const [settings, setSettings] = useState<TrainerSettings | null>(null);
  const [trainerLocations, setTrainerLocations] = useState<TrainerLocation[]>([]);

  const refresh = useCallback(async () => {
    const activeWeek = weekStart || defaultWeekStart();
    const [c, t, b, wa, sched, sett, locs] = await Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/whatsapp").then((r) => r.json()),
      fetch(`/api/schedule?weekStart=${activeWeek}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
    ]);
    setClients(c);
    setTemplates(t.templates);
    setBookings(b);
    setWhatsapp(wa);
    setScheduleEntries(sched.entries);
    setScheduleRange({ weekStart: sched.weekStart, weekEnd: sched.weekEnd });
    setSettings(sett);
    setTrainerLocations(locs);
  }, [weekStart]);

  useEffect(() => {
    refresh();
  }, [weekStart, refresh]);

  function changeWeek(delta: number) {
    setWeekStart((ws) => shiftWeekStart(ws || defaultWeekStart(), delta));
  }

  function goToThisWeek() {
    setWeekStart(defaultWeekStart());
  }

  async function applyTemplateToCurrentWeek(templateId: string) {
    setApplyingTemplate(true);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply",
        templateId,
        weekStart: scheduleRange.weekStart || weekStart,
      }),
    });
    const data = await res.json();
    setApplyingTemplate(false);
    if (!res.ok) {
      alert(data.error ?? "Failed to apply template");
      return false;
    }
    refresh();
    return true;
  }

  async function addScheduleSlot(
    dayOfWeek: number,
    startTime: string,
    locationId: string,
  ) {
    const res = await fetch("/api/schedule/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: scheduleRange.weekStart || weekStart,
        dayOfWeek,
        startTime,
        locationId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed to add slot");
      return;
    }
    refresh();
  }

  async function updateScheduleSlotLocation(slotId: string, locationId: string) {
    const res = await fetch("/api/schedule/slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, locationId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed to update location");
      return;
    }
    refresh();
  }

  async function removeScheduleSlot(slotId: string) {
    const res = await fetch(`/api/schedule/slots?slotId=${slotId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed to remove slot");
      return;
    }
    refresh();
  }

  async function allocateScheduleSlot(slotId: string, clientId: string) {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "allocate", slotId, clientId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed to allocate slot");
      return;
    }
    refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="text-lg font-bold sm:text-xl">PT Bookings</h1>
            <p className="truncate text-sm text-slate-500">
              {settings?.name ? `${settings.name} · Trainer dashboard` : "Trainer dashboard"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/info">
              <Button variant="secondary" className="px-2 text-xs sm:px-4 sm:text-sm">
                How it works
              </Button>
            </Link>
            <Button variant="secondary" className="px-2 text-xs sm:px-4 sm:text-sm" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          {NAV_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        {tab === "Schedule" && (
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3">
              <h2 className="font-semibold">Weekly schedule</h2>
              <p className="text-sm text-slate-600">
                Open slots show last-minute matches. Click to send offers or allocate directly.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                <Button
                  variant="secondary"
                  className="w-full px-2 text-xs sm:w-auto sm:px-4 sm:text-sm"
                  onClick={() => changeWeek(-1)}
                >
                  ← Prev
                </Button>
                <Button
                  variant="secondary"
                  className="w-full px-2 text-xs sm:w-auto sm:px-4 sm:text-sm"
                  onClick={goToThisWeek}
                >
                  This week
                </Button>
                <Button
                  variant="secondary"
                  className="w-full px-2 text-xs sm:w-auto sm:px-4 sm:text-sm"
                  onClick={() => changeWeek(1)}
                >
                  Next →
                </Button>
              </div>
            </div>
            {settings ? (
            <WeekScheduleCalendar
              weekStart={scheduleRange.weekStart || weekStart}
              entries={scheduleEntries}
              templates={templates.map((t) => ({ id: t.id, name: t.name }))}
              onApplyTemplate={applyTemplateToCurrentWeek}
              applyingTemplate={applyingTemplate}
              scheduleStartTime={settings.scheduleStartTime}
              scheduleEndTime={settings.scheduleEndTime}
              defaultView={settings.scheduleDefaultView}
              lockHours={settings.lastMinuteOfferLockHours}
              clients={clients.map((c) => ({ id: c.id, name: c.name }))}
              locations={trainerLocations}
              onAddSlot={addScheduleSlot}
              onRemoveSlot={removeScheduleSlot}
              onAllocateSlot={allocateScheduleSlot}
              onUpdateSlotLocation={updateScheduleSlotLocation}
              onRefresh={refresh}
            />
            ) : (
              <p className="text-sm text-slate-500">Loading schedule…</p>
            )}
          </Card>
        )}
        {tab === "Clients" && <ClientsTab clients={clients} />}
        {tab === "Templates" && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setTab("Settings")}
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              ← Back to settings
            </button>
            <TemplatesTab
              templates={templates}
              locations={trainerLocations}
              scheduleStartTime={settings?.scheduleStartTime ?? "07:00"}
              scheduleEndTime={settings?.scheduleEndTime ?? "21:00"}
              onRefresh={refresh}
            />
          </div>
        )}
        {tab === "Sessions" && (
          <SessionsTab bookings={bookings} onRefresh={refresh} />
        )}
        {tab === "WhatsApp" && <WhatsAppTab messages={whatsapp} />}
        {tab === "Settings" && (
          <SettingsTab
            settings={settings}
            onSaved={refresh}
            onOpenTemplates={() => setTab("Templates")}
          />
        )}
      </main>
    </div>
  );
}

function ClientsTab({ clients }: { clients: Client[] }) {
  function formatRecurring(
    prefs: { dayOfWeek: number; startTime: string }[],
  ) {
    if (prefs.length === 0) return "—";
    return prefs
      .map(
        (p) =>
          `${dayOfWeekLabel(p.dayOfWeek)} ${p.startTime}`,
      )
      .join(", ");
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="font-semibold">All clients</h2>
          <p className="text-sm text-slate-500">{clients.length} total</p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button>Add client</Button>
        </Link>
      </div>
        {clients.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No clients yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Session price</th>
                  <th className="px-4 py-3 font-medium">Recurring</th>
                  <th className="px-4 py-3 font-medium">Last-minute</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/dashboard/clients/${c.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.phone}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatSessionPrice(c.sessionPrice)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatRecurring(c.recurringPreferences)}
                    </td>
                    <td className="px-4 py-3">
                      {c.lastMinuteOptIn ? (
                        <Badge tone="success">Yes</Badge>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </Card>
  );
}

function TemplatesTab({
  templates,
  locations,
  scheduleStartTime,
  scheduleEndTime,
  onRefresh,
}: {
  templates: Template[];
  locations: TrainerLocation[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <CreateTemplateCard
        locations={locations}
        scheduleStartTime={scheduleStartTime}
        scheduleEndTime={scheduleEndTime}
        onCreated={onRefresh}
      />
      {templates.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No templates yet.</p>
        </Card>
      ) : (
        templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            locations={locations}
            scheduleStartTime={scheduleStartTime}
            scheduleEndTime={scheduleEndTime}
            onUpdated={onRefresh}
          />
        ))
      )}
    </div>
  );
}

function SessionsTab({
  bookings,
  onRefresh,
}: {
  bookings: BookingRow[];
  onRefresh: () => void;
}) {
  async function action(body: Record<string, string>) {
    await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onRefresh();
  }

  const sorted = [...bookings].sort((a, b) =>
    a.slot.startAt.localeCompare(b.slot.startAt),
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold">Sessions</h2>
        <p className="text-sm text-slate-500">{sorted.length} upcoming</p>
      </div>

      {sorted.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">
          No upcoming sessions. Apply a template first.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((row) => (
                <tr key={row.booking.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{row.client.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatSlot(row.slot.startAt)}
                  </td>
                  <td className="px-4 py-3">
                    {row.booking.status === "confirmed" ? (
                      <Badge tone="success">Confirmed</Badge>
                    ) : row.booking.status === "pending_change" ? (
                      <Badge tone="warning">Changing</Badge>
                    ) : (
                      <Badge>{row.booking.status}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {row.booking.isRecurring && <Badge>Recurring</Badge>}
                      {row.booking.override36h && (
                        <Badge tone="warning">36h override</Badge>
                      )}
                      {!row.booking.isRecurring && !row.booking.override36h && (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      className="text-blue-600 hover:underline"
                      href={`/s/${row.booking.token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[14rem] flex-wrap gap-1.5">
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        onClick={() =>
                          action({
                            action: "send_confirmation",
                            bookingId: row.booking.id,
                          })
                        }
                      >
                        WhatsApp
                      </Button>
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        onClick={() =>
                          action({
                            action: "toggle_override_36h",
                            bookingId: row.booking.id,
                          })
                        }
                      >
                        36h
                      </Button>
                      <Button
                        variant="danger"
                        className="px-2 py-1 text-xs"
                        onClick={() =>
                          action({
                            action: "cancel",
                            bookingId: row.booking.id,
                          })
                        }
                      >
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function SettingsTab({
  settings,
  onSaved,
  onOpenTemplates,
}: {
  settings: TrainerSettings | null;
  onSaved: () => void;
  onOpenTemplates: () => void;
}) {
  const [scheduleStartTime, setScheduleStartTime] = useState("07:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("21:00");
  const [scheduleDefaultView, setScheduleDefaultView] = useState<"day" | "week">("day");
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState("36");
  const [lastMinuteOfferLockHours, setLastMinuteOfferLockHours] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setScheduleStartTime(settings.scheduleStartTime);
      setScheduleEndTime(settings.scheduleEndTime);
      setScheduleDefaultView(settings.scheduleDefaultView);
      setCancelDeadlineHours(String(settings.cancelDeadlineHours));
      setLastMinuteOfferLockHours(String(settings.lastMinuteOfferLockHours));
    }
  }, [settings]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduleStartTime,
        scheduleEndTime,
        scheduleDefaultView,
        cancelDeadlineHours: Number(cancelDeadlineHours),
        lastMinuteOfferLockHours: Number(lastMinuteOfferLockHours),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      return;
    }
    setSaved(true);
    onSaved();
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-semibold">Settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          General preferences for your booking app.
        </p>

        <form onSubmit={save} className="mt-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-slate-900">Schedule hours</h3>
          <p className="mt-1 text-sm text-slate-500">
            Only show these hours on the weekly schedule. Times before the start or from the
            end time onward are hidden.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Start time</span>
              <input
                type="time"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={scheduleStartTime}
                onChange={(e) => setScheduleStartTime(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">End time</span>
              <input
                type="time"
                className="rounded-lg border border-slate-300 px-3 py-2"
                value={scheduleEndTime}
                onChange={(e) => setScheduleEndTime(e.target.value)}
                required
              />
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-900">Default schedule view</h3>
          <p className="mt-1 text-sm text-slate-500">
            Which layout to show first when you open the Schedule tab. You can still
            switch between day and week at any time.
          </p>
          <div className="mt-3 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["day", "week"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setScheduleDefaultView(mode)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition ${
                  scheduleDefaultView === mode
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-900">
            Change &amp; cancellation threshold
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Clients cannot change or cancel a session within this many hours of
            the start time. Trainers can override this per booking from the
            Sessions tab.
          </p>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Hours before session</span>
            <input
              type="number"
              min={1}
              max={168}
              step={1}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2"
              value={cancelDeadlineHours}
              onChange={(e) => setCancelDeadlineHours(e.target.value)}
              required
            />
          </label>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-900">Last-minute offers</h3>
          <p className="mt-1 text-sm text-slate-500">
            When you send a last-minute offer, the slot is reserved for that client
            for this many hours before you can offer it to someone else.
          </p>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Offer lock (hours)</span>
            <input
              type="number"
              min={1}
              max={72}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2"
              value={lastMinuteOfferLockHours}
              onChange={(e) => setLastMinuteOfferLockHours(e.target.value)}
              required
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-700">Settings saved.</p>}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </form>
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-slate-900">Weekly templates</h3>
        <p className="mt-1 text-sm text-slate-500">
          Define reusable weekly slot patterns and apply them to your schedule.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={onOpenTemplates}
        >
          Manage templates →
        </Button>
      </Card>

      <LocationsSection />
    </div>
  );
}

type LocationRow = { id: string; name: string; createdAt: string };

function LocationsSection() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    const res = await fetch("/api/locations");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data: LocationRow[] = await res.json();
    setLocations(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setAdding(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to add location");
      return;
    }

    setName("");
    await loadLocations();
  }

  function startEditing(location: LocationRow) {
    setEditingId(location.id);
    setEditName(location.name);
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
  }

  async function saveLocationName(id: string) {
    setSavingId(id);
    setError(null);
    const res = await fetch(`/api/locations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    const data = await res.json();
    setSavingId(null);

    if (!res.ok) {
      setError(data.error ?? "Failed to update location");
      return;
    }

    cancelEditing();
    await loadLocations();
  }

  async function removeLocation(id: string) {
    setDeletingId(id);
    setError(null);
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);

    if (!res.ok) {
      setError(data.error ?? "Failed to delete location");
      return;
    }

    await loadLocations();
  }

  return (
    <Card>
      <h2 className="font-semibold">Locations</h2>
      <p className="mt-1 text-sm text-slate-600">
        Places where you train. Assign which locations each client can use from
        their profile page.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading locations…</p>
      ) : locations.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No locations yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 border border-slate-100 rounded-lg">
          {locations.map((location) => (
            <li
              key={location.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              {editingId === location.id ? (
                <form
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveLocationName(location.id);
                  }}
                >
                  <input
                    className="min-w-[10rem] flex-1 rounded-lg border border-slate-300 px-3 py-1.5"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="px-3 py-1.5 text-xs"
                    disabled={savingId === location.id}
                  >
                    {savingId === location.id ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-3 py-1.5 text-xs"
                    disabled={savingId === location.id}
                    onClick={cancelEditing}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <span>{location.name}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-900 disabled:opacity-50"
                      disabled={deletingId === location.id || savingId !== null}
                      onClick={() => startEditing(location)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-slate-500 hover:text-red-600 disabled:opacity-50"
                      disabled={deletingId === location.id || savingId !== null}
                      onClick={() => removeLocation(location.id)}
                    >
                      {deletingId === location.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addLocation} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          <span className="text-slate-600">New location</span>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main gym, Home studio"
            required
          />
        </label>
        <Button type="submit" disabled={adding}>
          {adding ? "Adding…" : "Add location"}
        </Button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Card>
  );
}

function whatsAppTypeLabel(messageType: string): string {
  switch (messageType) {
    case "confirmation":
      return "Booking confirmation";
    case "last_minute":
      return "Last-minute offer";
    case "interest_ack":
      return "Interest acknowledgement";
    default:
      return messageType;
  }
}

function WhatsAppTab({ messages }: { messages: WhatsAppRow[] }) {
  return (
    <div className="space-y-3">
      {messages.length === 0 && (
        <Card>
          <p className="text-slate-500">
            No messages yet. Messages are logged here (WhatsApp stub — check server console too).
          </p>
        </Card>
      )}
      {messages.map((m) => (
        <Card key={m.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{whatsAppTypeLabel(m.messageType)}</Badge>
              <span className="text-sm text-slate-500">{m.phone}</span>
            </div>
            <time
              dateTime={m.createdAt}
              className="text-xs text-slate-400"
            >
              {formatDateTime(m.createdAt)}
            </time>
          </div>
          <p className="mt-2 text-sm">{m.body}</p>
        </Card>
      ))}
    </div>
  );
}
