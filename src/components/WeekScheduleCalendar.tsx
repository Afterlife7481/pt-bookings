import { Fragment, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { addDays, formatDate, formatSlotLabel, parseDateOnly, hoursInScheduleRange } from "@/lib/constants";
import type { ScheduleEntry } from "@/lib/services/schedule";

const WEEK_DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const ROW_HEIGHT = "h-11";

type TemplateOption = { id: string; name: string };
type ClientOption = { id: string; name: string };

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function dateForWeekDay(weekStart: string, dayOfWeek: number): Date {
  const monday = parseDateOnly(weekStart);
  const mondayDow = monday.getDay();
  const offset = (dayOfWeek - mondayDow + 7) % 7;
  return addDays(monday, offset);
}

function dayHeader(weekStart: string, dayOfWeek: number): string {
  const d = dateForWeekDay(weekStart, dayOfWeek);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function hourFromStartAt(startAt: string): number {
  return parseInt(startAt.split("T")[1]?.slice(0, 2) ?? "0", 10);
}

function dateKeyFromStartAt(startAt: string): string {
  return startAt.split("T")[0] ?? "";
}

function buildScheduleGrid(weekStart: string, entries: ScheduleEntry[]) {
  const map = new Map<string, ScheduleEntry>();
  for (const entry of entries) {
    const dateKey = dateKeyFromStartAt(entry.startAt);
    const hour = hourFromStartAt(entry.startAt);
    map.set(`${dateKey}-${hour}`, entry);
  }
  return map;
}

function isPastSlot(weekStart: string, dayOfWeek: number, hour: number): boolean {
  const d = dateForWeekDay(weekStart, dayOfWeek);
  d.setHours(hour, 0, 0, 0);
  return d < new Date();
}

function ScheduleCell({
  entry,
  editable,
  onOpen,
  selected,
}: {
  entry: ScheduleEntry;
  editable?: boolean;
  onOpen?: (entry: ScheduleEntry) => void;
  selected?: boolean;
}) {
  const booked = entry.booking && entry.status !== "available";

  if (entry.status === "pending_change") {
    return (
      <div
        className={cn(
          ROW_HEIGHT,
          "flex flex-col justify-center rounded border border-amber-200 bg-amber-50 px-1 py-0.5",
        )}
      >
        <span className="truncate text-[10px] font-medium text-amber-900">
          {entry.booking?.clientName ?? "—"}
        </span>
        <span className="text-[9px] text-amber-700">Changing</span>
      </div>
    );
  }

  if (booked && entry.booking) {
    return (
      <a
        href={`/s/${entry.booking.token}`}
        target="_blank"
        rel="noreferrer"
        className={cn(
          ROW_HEIGHT,
          "flex flex-col justify-center rounded border border-slate-300 bg-slate-900 px-1 py-0.5 text-white transition hover:bg-slate-800",
        )}
      >
        <span className="truncate text-[10px] font-medium">{entry.booking.clientName}</span>
        {entry.booking.isRecurring && (
          <span className="text-[9px] text-slate-300">Recurring</span>
        )}
      </a>
    );
  }

  if (editable && onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(entry)}
        title="Manage open slot"
        className={cn(
          ROW_HEIGHT,
          "flex w-full items-center justify-center rounded border border-green-200 bg-green-50 transition hover:border-green-300 hover:bg-green-100",
          selected && "border-green-400 bg-green-100 ring-1 ring-green-300",
        )}
      >
        <span className="text-[9px] font-medium text-green-700">Open</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        ROW_HEIGHT,
        "flex items-center justify-center rounded border border-green-200 bg-green-50",
      )}
    >
      <span className="text-[9px] font-medium text-green-700">Open</span>
    </div>
  );
}

function OpenSlotModal({
  entry,
  clients,
  onAllocate,
  onRemove,
  onClose,
  busy,
}: {
  entry: ScheduleEntry;
  clients: ClientOption[];
  onAllocate: (slotId: string, clientId: string) => Promise<void>;
  onRemove: (slotId: string) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-slate-900">Open slot</h3>
        <p className="mt-1 text-sm text-slate-600">{formatSlotLabel(entry.startAt)}</p>

        {clients.length > 0 ? (
          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-slate-600">Allocate to client</span>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={busy}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Add a client under the Clients tab before allocating this slot.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {clients.length > 0 && (
            <Button
              disabled={!clientId || busy}
              onClick={() => onAllocate(entry.slotId, clientId)}
            >
              {busy ? "Saving…" : "Allocate to client"}
            </Button>
          )}
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => onRemove(entry.slotId)}
          >
            Remove slot
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function ApplyTemplatePanel({
  weekStart,
  templates,
  onApply,
  applying,
}: {
  weekStart: string;
  templates: TemplateOption[];
  onApply: (templateId: string) => void;
  applying: boolean;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templates[0]?.id ?? "",
  );

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-600">No weekly template yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Create one under the Templates tab, then come back here to apply it to this week.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
      <p className="font-medium text-slate-900">No schedule for this week</p>
      <p className="mt-1 text-sm text-slate-600">
        Apply a weekly template to generate slots for{" "}
        {formatDate(parseDateOnly(weekStart))} onwards.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Template</span>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <Button
          disabled={!selectedTemplateId || applying}
          onClick={() => onApply(selectedTemplateId)}
        >
          {applying ? "Applying…" : "Apply template to this week"}
        </Button>
      </div>
    </div>
  );
}

export function WeekScheduleCalendar({
  weekStart,
  entries,
  appliedWeek,
  templates,
  onApplyTemplate,
  applyingTemplate,
  scheduleStartTime = "07:00",
  scheduleEndTime = "21:00",
  clients = [],
  onAddSlot,
  onRemoveSlot,
  onAllocateSlot,
}: {
  weekStart: string;
  entries: ScheduleEntry[];
  appliedWeek: { templateId: string; templateName: string } | null;
  templates: TemplateOption[];
  onApplyTemplate?: (templateId: string) => void;
  applyingTemplate?: boolean;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  clients?: ClientOption[];
  onAddSlot?: (dayOfWeek: number, startTime: string) => Promise<void> | void;
  onRemoveSlot?: (slotId: string) => Promise<void> | void;
  onAllocateSlot?: (slotId: string, clientId: string) => Promise<void> | void;
}) {
  const grid = buildScheduleGrid(weekStart, entries);
  const hours = hoursInScheduleRange(scheduleStartTime, scheduleEndTime);
  const editable = !!appliedWeek && (!!onAddSlot || !!onRemoveSlot || !!onAllocateSlot);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedOpenSlot, setSelectedOpenSlot] = useState<ScheduleEntry | null>(null);

  async function handleAdd(dayOfWeek: number, hour: number) {
    if (!onAddSlot || busyKey) return;
    const key = `add-${dayOfWeek}-${hour}`;
    setBusyKey(key);
    try {
      await onAddSlot(dayOfWeek, formatHour(hour));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemove(slotId: string) {
    if (!onRemoveSlot || busyKey) return;
    setBusyKey(`remove-${slotId}`);
    try {
      await onRemoveSlot(slotId);
      setSelectedOpenSlot(null);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAllocate(slotId: string, clientId: string) {
    if (!onAllocateSlot || busyKey) return;
    setBusyKey(`allocate-${slotId}`);
    try {
      await onAllocateSlot(slotId, clientId);
      setSelectedOpenSlot(null);
    } finally {
      setBusyKey(null);
    }
  }

  function openSlotActions(entry: ScheduleEntry) {
    if (entry.booking || entry.status !== "available") return;
    setSelectedOpenSlot(entry);
  }

  const bookedCount = entries.filter((e) => e.booking).length;
  const openCount = entries.filter((e) => !e.booking && e.status === "available").length;

  if (entries.length === 0) {
    return (
      <ApplyTemplatePanel
        weekStart={weekStart}
        templates={templates}
        onApply={onApplyTemplate ?? (() => {})}
        applying={applyingTemplate ?? false}
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span>
          {formatDate(parseDateOnly(weekStart))} —{" "}
          {formatDate(addDays(parseDateOnly(weekStart), 6))}
        </span>
        {appliedWeek && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            {appliedWeek.templateName}
          </span>
        )}
        <span>{bookedCount} booked</span>
        <span>{openCount} open</span>
        {editable && (
          <span className="text-xs text-slate-500">
            Click empty cells to add · click open slots to allocate or remove
          </span>
        )}
      </div>

      <div className="max-h-[36rem] overflow-auto rounded-lg border border-slate-200">
        <div
          className="grid min-w-[720px]"
          style={{
            gridTemplateColumns: "3.25rem repeat(7, minmax(4.5rem, 1fr))",
            gridTemplateRows: `auto repeat(${hours.length}, 2.75rem)`,
          }}
        >
          <div className="sticky left-0 top-0 z-20 border-b border-r border-slate-200 bg-slate-50" />
          {WEEK_DAYS.map((day) => (
            <div
              key={`head-${day.value}`}
              className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-1 py-2 text-center"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {day.label}
              </div>
              <div className="text-[10px] text-slate-400">
                {dayHeader(weekStart, day.value).replace(/^\w+\s/, "")}
              </div>
            </div>
          ))}

          {hours.map((hour) => (
            <Fragment key={hour}>
              <div
                className={cn(
                  ROW_HEIGHT,
                  "sticky left-0 z-10 flex items-center border-r border-slate-200 bg-slate-50 pr-2 text-right text-[10px] tabular-nums text-slate-400",
                  hour > 0 && "border-t border-slate-100",
                )}
              >
                {formatHour(hour)}
              </div>
              {WEEK_DAYS.map((day) => {
                const dateKey = formatDate(dateForWeekDay(weekStart, day.value));
                const entry = grid.get(`${dateKey}-${hour}`);
                return (
                  <div
                    key={`${dateKey}-${hour}`}
                    className={cn(
                      ROW_HEIGHT,
                      "border-slate-100 p-0.5",
                      hour > 0 && "border-t",
                    )}
                  >
                    {entry ? (
                      <ScheduleCell
                        entry={entry}
                        editable={
                          editable &&
                          !entry.booking &&
                          entry.status === "available"
                        }
                        onOpen={editable ? openSlotActions : undefined}
                        selected={selectedOpenSlot?.slotId === entry.slotId}
                      />
                    ) : editable && onAddSlot && !isPastSlot(weekStart, day.value, hour) ? (
                      <button
                        type="button"
                        disabled={!!busyKey}
                        onClick={() => handleAdd(day.value, hour)}
                        title="Add slot"
                        className={cn(
                          ROW_HEIGHT,
                          "group flex w-full items-center justify-center rounded border border-transparent bg-white transition hover:border-slate-300 hover:bg-slate-50",
                          busyKey === `add-${day.value}-${hour}` && "opacity-50",
                        )}
                      >
                        <span className="text-[9px] text-slate-300 opacity-0 transition group-hover:opacity-100">
                          + Add
                        </span>
                      </button>
                    ) : (
                      <div className={cn(ROW_HEIGHT, "bg-white")} />
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {selectedOpenSlot && (
        <OpenSlotModal
          entry={selectedOpenSlot}
          clients={clients}
          onAllocate={handleAllocate}
          onRemove={handleRemove}
          onClose={() => !busyKey && setSelectedOpenSlot(null)}
          busy={!!busyKey}
        />
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-slate-900" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-green-200 bg-green-50" /> Open
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-amber-50 ring-1 ring-amber-200" /> Changing
        </span>
      </div>
    </div>
  );
}
