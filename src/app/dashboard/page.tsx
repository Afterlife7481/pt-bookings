"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import {
  RecurringWeekCalendar,
  slotKey,
  parseSlotKey,
  type RecurringSlotOption,
} from "@/components/RecurringWeekCalendar";
import { WeekScheduleCalendar } from "@/components/WeekScheduleCalendar";
import { DAY_OPTIONS, formatSlot } from "@/lib/utils";
import { defaultWeekStart, shiftWeekStart } from "@/lib/schedule-utils";
import type { ScheduleEntry } from "@/lib/services/schedule";

type Client = {
  id: string;
  token: string;
  name: string;
  phone: string;
  lastMinuteOptIn: boolean;
  recurringPreferences: {
    dayOfWeek: number;
    startTime: string;
  }[];
};

type Template = {
  id: string;
  name: string;
  slots: { dayOfWeek: number; startTime: string }[];
};

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

type LastMinuteRow = {
  slot: { id: string; startAt: string };
  interests: { interest: { id: string }; client: { id: string; name: string } }[];
};

type WhatsAppRow = {
  id: string;
  phone: string;
  messageType: string;
  body: string;
  createdAt: string;
};

const TABS = [
  "Schedule",
  "Clients",
  "Templates",
  "Sessions",
  "Last-minute",
  "WhatsApp",
  "Settings",
] as const;

type TrainerSettings = {
  scheduleStartTime: string;
  scheduleEndTime: string;
  cancelDeadlineHours: number;
  timezone: string;
  name: string;
  email: string;
};

export default function DashboardPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Schedule");
  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [scheduleRange, setScheduleRange] = useState({ weekStart: "", weekEnd: "" });
  const [appliedWeek, setAppliedWeek] = useState<{
    templateId: string;
    templateName: string;
  } | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [lastMinute, setLastMinute] = useState<LastMinuteRow[]>([]);
  const [whatsapp, setWhatsapp] = useState<WhatsAppRow[]>([]);
  const [settings, setSettings] = useState<TrainerSettings | null>(null);

  const refresh = useCallback(async () => {
    const [c, t, b, lm, wa, sched, sett] = await Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/last-minute").then((r) => r.json()),
      fetch("/api/whatsapp").then((r) => r.json()),
      fetch(`/api/schedule?weekStart=${weekStart}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]);
    setClients(c);
    setTemplates(t.templates);
    setBookings(b);
    setLastMinute(lm);
    setWhatsapp(wa);
    setScheduleEntries(sched.entries);
    setScheduleRange({ weekStart: sched.weekStart, weekEnd: sched.weekEnd });
    setAppliedWeek(sched.appliedWeek);
    setSettings(sett);
  }, [weekStart]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function changeWeek(delta: number) {
    setWeekStart((ws) => shiftWeekStart(ws, delta));
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
      return;
    }
    refresh();
  }

  async function addScheduleSlot(dayOfWeek: number, startTime: string) {
    const res = await fetch("/api/schedule/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: scheduleRange.weekStart || weekStart,
        dayOfWeek,
        startTime,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Failed to add slot");
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">PT Bookings</h1>
            <p className="text-sm text-slate-500">Trainer dashboard</p>
          </div>
          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-6 pb-3">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-6">
        {tab === "Schedule" && (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Weekly schedule</h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => changeWeek(-1)}>
                  ← Prev
                </Button>
                <Button variant="secondary" onClick={goToThisWeek}>
                  This week
                </Button>
                <Button variant="secondary" onClick={() => changeWeek(1)}>
                  Next →
                </Button>
              </div>
            </div>
            <WeekScheduleCalendar
              weekStart={scheduleRange.weekStart || weekStart}
              entries={scheduleEntries}
              appliedWeek={appliedWeek}
              templates={templates.map((t) => ({ id: t.id, name: t.name }))}
              onApplyTemplate={applyTemplateToCurrentWeek}
              applyingTemplate={applyingTemplate}
              scheduleStartTime={settings?.scheduleStartTime ?? "07:00"}
              scheduleEndTime={settings?.scheduleEndTime ?? "21:00"}
              clients={clients.map((c) => ({ id: c.id, name: c.name }))}
              onAddSlot={appliedWeek ? addScheduleSlot : undefined}
              onRemoveSlot={appliedWeek ? removeScheduleSlot : undefined}
              onAllocateSlot={appliedWeek ? allocateScheduleSlot : undefined}
            />
          </Card>
        )}
        {tab === "Clients" && (
          <ClientsTab clients={clients} onRefresh={refresh} />
        )}
        {tab === "Templates" && (
          <TemplatesTab templates={templates} onRefresh={refresh} />
        )}
        {tab === "Sessions" && (
          <SessionsTab bookings={bookings} onRefresh={refresh} />
        )}
        {tab === "Last-minute" && (
          <LastMinuteTab rows={lastMinute} onRefresh={refresh} />
        )}
        {tab === "WhatsApp" && <WhatsAppTab messages={whatsapp} />}
        {tab === "Settings" && (
          <SettingsTab settings={settings} onSaved={refresh} />
        )}
      </main>
    </div>
  );
}

function ClientsTab({
  clients,
  onRefresh,
}: {
  clients: Client[];
  onRefresh: () => void;
}) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [recurringOptions, setRecurringOptions] = useState<RecurringSlotOption[]>([]);
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<Set<string>>(new Set());
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  async function loadRecurringOptions(clientId: string, client: Client) {
    setLoadingOptions(true);
    setRecurringError(null);
    const res = await fetch(`/api/clients/${clientId}/recurring-options`);
    const options: RecurringSlotOption[] = await res.json();
    setRecurringOptions(options);

    if (client.recurringPreferences.length > 0) {
      setSelectedSlotKeys(
        new Set(
          client.recurringPreferences.map((p) => slotKey(p.dayOfWeek, p.startTime)),
        ),
      );
    } else {
      setSelectedSlotKeys(new Set());
    }
    setLoadingOptions(false);
  }

  async function addClient(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clientName, phone: clientPhone }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to add client");
      return;
    }
    setClientName("");
    setClientPhone("");
    onRefresh();
  }

  function selectClient(client: Client) {
    setSelectedClientId(client.id);
    loadRecurringOptions(client.id, client);
  }

  function toggleSlot(key: string) {
    const option = recurringOptions.find(
      (o) => slotKey(o.dayOfWeek, o.startTime) === key,
    );
    if (!option?.available) return;

    setSelectedSlotKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveRecurringSlots(slots: { dayOfWeek: number; startTime: string }[]) {
    if (!selectedClientId) return;
    setSavingRecurring(true);
    setRecurringError(null);
    const res = await fetch(`/api/clients/${selectedClientId}`, {
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
    onRefresh();
    if (selectedClient) {
      loadRecurringOptions(selectedClientId, {
        ...selectedClient,
        recurringPreferences: slots,
      });
    }
  }

  function handleSaveSelectedSlots() {
    const slots = [...selectedSlotKeys].map(parseSlotKey);
    saveRecurringSlots(slots);
  }

  function handleClearAllSlots() {
    setSelectedSlotKeys(new Set());
    saveRecurringSlots([]);
  }

  return (
    <>
      <Card>
        <h2 className="font-semibold">Add client</h2>
        <form onSubmit={addClient} className="mt-4 flex flex-wrap gap-3">
          <input
            className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
          />
          <input
            className="min-w-[160px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Phone (+44...)"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            required
          />
          <Button type="submit">Save client</Button>
        </form>
      </Card>

      {selectedClient && (
        <Card>
          <h2 className="font-semibold">Recurring slots — {selectedClient.name}</h2>
          <a
            className="mt-2 inline-block text-sm text-blue-600 underline"
            href={`/c/${selectedClient.token}`}
            target="_blank"
            rel="noreferrer"
          >
            Client link
          </a>
          <p className="mt-1 text-sm text-slate-600">
            Click slots to select multiple. Slots assigned to another client are unavailable.
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
            <p className="mt-4 text-sm text-slate-500">Loading available slots…</p>
          ) : recurringOptions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No template slots found. Create a weekly template first.
            </p>
          ) : (
            <RecurringWeekCalendar
              options={recurringOptions}
              selectedSlotKeys={selectedSlotKeys}
              onToggle={toggleSlot}
            />
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={savingRecurring} onClick={handleSaveSelectedSlots}>
              Save recurring slots
            </Button>
            {(selectedClient.recurringPreferences.length > 0 ||
              selectedSlotKeys.size > 0) && (
              <Button
                variant="secondary"
                disabled={savingRecurring}
                onClick={handleClearAllSlots}
              >
                Clear all
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-3">
        {clients.map((c) => (
          <Card
            key={c.id}
            className={
              selectedClientId === c.id ? "ring-2 ring-slate-900 ring-offset-2" : undefined
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-slate-500">{c.phone}</p>
                <a
                  className="mt-1 inline-block text-sm text-blue-600 underline"
                  href={`/c/${c.token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Client link
                </a>
                {c.recurringPreferences.length > 0 ? (
                  <p className="mt-1 text-sm text-slate-600">
                    Recurring:{" "}
                    {c.recurringPreferences
                      .map(
                        (p) =>
                          `${DAY_OPTIONS.find((d) => d.value === p.dayOfWeek)?.label} ${p.startTime}`,
                      )
                      .join(", ")}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">No recurring slots</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-col gap-1">
                  {c.lastMinuteOptIn && <Badge tone="success">Last-minute</Badge>}
                  {c.recurringPreferences.length > 0 && (
                    <Badge>{c.recurringPreferences.length} recurring</Badge>
                  )}
                </div>
                <Button
                  variant={selectedClientId === c.id ? "primary" : "secondary"}
                  onClick={() => selectClient(c)}
                >
                  {selectedClientId === c.id ? "Selected" : "Set recurring"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function TemplatesTab({
  templates,
  onRefresh,
}: {
  templates: Template[];
  onRefresh: () => void;
}) {
  const [name, setName] = useState("");
  const [slotDay, setSlotDay] = useState(1);
  const [slotTime, setSlotTime] = useState("09:00");
  const [draftSlots, setDraftSlots] = useState<{ dayOfWeek: number; startTime: string }[]>([]);

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (draftSlots.length === 0) {
      alert("Add at least one slot to the template");
      return;
    }
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slots: draftSlots }),
    });
    setName("");
    setDraftSlots([]);
    onRefresh();
  }

  return (
    <>
      <Card>
        <h2 className="font-semibold">Create weekly template</h2>
        <form onSubmit={saveTemplate} className="mt-4 space-y-3">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Template name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={slotDay}
              onChange={(e) => setSlotDay(Number(e.target.value))}
            >
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <input
              type="time"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={slotTime}
              onChange={(e) => setSlotTime(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setDraftSlots((s) => [...s, { dayOfWeek: slotDay, startTime: slotTime }])
              }
            >
              Add slot
            </Button>
          </div>
          {draftSlots.length > 0 && (
            <ul className="text-sm text-slate-600">
              {draftSlots.map((s, i) => (
                <li key={i}>
                  {DAY_OPTIONS.find((d) => d.value === s.dayOfWeek)?.label} {s.startTime}
                </li>
              ))}
            </ul>
          )}
          <Button type="submit">Save template</Button>
        </form>
      </Card>

      {templates.map((t) => (
        <Card key={t.id}>
          <p className="font-medium">{t.name}</p>
          <ul className="mt-2 text-sm text-slate-600">
            {t.slots.map((s, i) => (
              <li key={i}>
                {DAY_OPTIONS.find((d) => d.value === s.dayOfWeek)?.label} {s.startTime}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-400">
            Apply this template from the Schedule tab, one week at a time.
          </p>
        </Card>
      ))}
    </>
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

  return (
    <div className="space-y-3">
      {bookings.length === 0 && (
        <Card>
          <p className="text-slate-500">No upcoming sessions. Apply a template first.</p>
        </Card>
      )}
      {bookings.map((row) => (
        <Card key={row.booking.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-medium">{row.client.name}</p>
              <p className="text-sm text-slate-600">{formatSlot(row.slot.startAt)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{row.booking.status}</Badge>
                {row.booking.isRecurring && <Badge>Recurring</Badge>}
                {row.booking.override36h && <Badge tone="warning">36h override</Badge>}
              </div>
              <a
                className="mt-2 inline-block text-sm text-blue-600 underline"
                href={`/s/${row.booking.token}`}
                target="_blank"
                rel="noreferrer"
              >
                Session link
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  action({
                    action: "send_confirmation",
                    bookingId: row.booking.id,
                  })
                }
              >
                Send WhatsApp
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  action({
                    action: "toggle_override_36h",
                    bookingId: row.booking.id,
                  })
                }
              >
                Toggle 36h override
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  action({ action: "cancel", bookingId: row.booking.id })
                }
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function LastMinuteTab({
  rows,
  onRefresh,
}: {
  rows: LastMinuteRow[];
  onRefresh: () => void;
}) {
  async function assign(slotId: string, clientId: string) {
    await fetch("/api/last-minute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, clientId }),
    });
    onRefresh();
  }

  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-slate-500">
          No open slots with client interest. Interests appear when a slot opens and waitlisted clients respond.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.slot.id}>
          <p className="font-medium">{formatSlot(row.slot.startAt)}</p>
          <p className="mt-1 text-sm text-slate-500">Interested clients:</p>
          <ul className="mt-3 space-y-2">
            {row.interests.map(({ client }) => (
              <li key={client.id} className="flex items-center justify-between">
                <span>{client.name}</span>
                <Button onClick={() => assign(row.slot.id, client.id)}>
                  Assign
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function SettingsTab({
  settings,
  onSaved,
}: {
  settings: TrainerSettings | null;
  onSaved: () => void;
}) {
  const [scheduleStartTime, setScheduleStartTime] = useState("07:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("21:00");
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState("36");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setScheduleStartTime(settings.scheduleStartTime);
      setScheduleEndTime(settings.scheduleEndTime);
      setCancelDeadlineHours(String(settings.cancelDeadlineHours));
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
        cancelDeadlineHours: Number(cancelDeadlineHours),
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

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-700">Settings saved.</p>}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </Card>
  );
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
      {[...messages].reverse().map((m) => (
        <Card key={m.id}>
          <div className="flex items-center gap-2">
            <Badge>{m.messageType}</Badge>
            <span className="text-sm text-slate-500">{m.phone}</span>
          </div>
          <p className="mt-2 text-sm">{m.body}</p>
        </Card>
      ))}
    </div>
  );
}
