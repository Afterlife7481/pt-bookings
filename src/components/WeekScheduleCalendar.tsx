import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { LocationSelect } from "@/components/LocationSelect";
import { SheetModal } from "@/components/SheetModal";
import { OpenSlotLastMinuteSection } from "@/components/OpenSlotLastMinuteSection";
import {
  ScheduleViewToggle,
  type ScheduleView,
} from "@/components/ScheduleViewToggle";
import { WeeklyHourGrid } from "@/components/WeeklyHourGrid";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";
import {
  addDays,
  formatDate,
  formatSlotLabel,
  parseDateOnly,
  hoursInScheduleRange,
} from "@/lib/constants";
import {
  WEEK_DAYS,
  dayHeaderInitial,
  formatScheduleHour,
} from "@/lib/schedule-grid";
import type { ScheduleEntry } from "@/lib/services/schedule";

type TemplateOption = { id: string; name: string };
type ClientOption = { id: string; name: string };
type LocationOption = { id: string; name: string };

function DayPicker({
  weekStart,
  selectedDay,
  onSelectDay,
  hours,
  grid,
}: {
  weekStart: string;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  hours: number[];
  grid: Map<string, ScheduleEntry>;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {WEEK_DAYS.map((day) => {
        const isSelected = selectedDay === day.value;
        const dateKey = formatDate(dateForWeekDay(weekStart, day.value));
        const daySlots = hours.filter((h) => grid.has(`${dateKey}-${h}`)).length;

        return (
          <button
            key={day.value}
            type="button"
            onClick={() => onSelectDay(day.value)}
            className={cn(
              "flex min-w-[4.25rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2 transition",
              isSelected
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 active:bg-slate-50",
            )}
          >
            <span className="text-xs font-semibold">{day.label}</span>
            <span
              className={cn(
                "text-[10px]",
                isSelected ? "text-slate-300" : "text-slate-400",
              )}
            >
              {dayShortDate(weekStart, day.value)}
            </span>
            {daySlots > 0 && (
              <span
                className={cn(
                  "mt-1 rounded-full px-1.5 text-[10px] font-medium",
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                {daySlots}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function dateForWeekDay(weekStart: string, dayOfWeek: number): Date {
  const monday = parseDateOnly(weekStart);
  const mondayDow = monday.getDay();
  const offset = (dayOfWeek - mondayDow + 7) % 7;
  return addDays(monday, offset);
}

function dayHeader(weekStart: string, dayOfWeek: number): string {
  const d = dateForWeekDay(weekStart, dayOfWeek);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function dayShortDate(weekStart: string, dayOfWeek: number): string {
  const d = dateForWeekDay(weekStart, dayOfWeek);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function defaultSelectedDay(weekStart: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseDateOnly(weekStart);
  const end = addDays(start, 6);
  if (today >= start && today <= end) {
    return today.getDay();
  }
  return 1;
}

function isPastSlot(
  weekStart: string,
  dayOfWeek: number,
  hour: number,
  nowMs: number | null,
): boolean {
  if (nowMs === null) return false;
  const d = dateForWeekDay(weekStart, dayOfWeek);
  d.setHours(hour, 0, 0, 0);
  return d.getTime() < nowMs;
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

function ScheduleCell({
  entry,
  editable,
  onOpen,
  selected,
  mobile = false,
  compact = false,
}: {
  entry: ScheduleEntry;
  editable?: boolean;
  onOpen?: (entry: ScheduleEntry) => void;
  selected?: boolean;
  mobile?: boolean;
  compact?: boolean;
}) {
  const booked = entry.booking && entry.status !== "available";
  const sizeClass = mobile
    ? "min-h-12 px-3 py-2"
    : compact
      ? "h-full min-h-0 px-0.5 py-0.5"
      : "h-11 px-1 py-0.5";
  const nameClass = mobile
    ? "text-sm font-medium"
    : compact
      ? "truncate text-[9px] font-medium leading-tight"
      : "truncate text-[10px] font-medium";
  const subClass = mobile ? "text-xs" : compact ? "text-[8px] leading-tight" : "text-[9px]";

  if (booked && entry.booking) {
    const recurring = entry.booking.isRecurring;

    return (
      <a
        href={`/s/${entry.booking.token}`}
        target="_blank"
        rel="noreferrer"
        title={
          entry.location
            ? `${entry.booking.clientName} · ${entry.location.name}`
            : entry.booking.clientName
        }
        className={cn(
          sizeClass,
          "flex w-full flex-col items-center justify-center rounded-lg border text-center transition",
          recurring
            ? "border-blue-300 bg-blue-600 text-white active:bg-blue-700"
            : "border-slate-300 bg-slate-900 text-white active:bg-slate-800",
        )}
      >
        <span className={cn(nameClass, "w-full truncate")}>
          {entry.booking.clientName}
        </span>
        {entry.location && (
          <span
            className={cn(
              subClass,
              "w-full truncate",
              recurring ? "text-blue-100" : "text-slate-300",
            )}
          >
            {entry.location.name}
          </span>
        )}
      </a>
    );
  }

  if (editable && onOpen) {
    const lm = entry.lastMinute;
    const isHeld = !!lm?.heldForClientId;
    const hasOffer = lm?.offers.some((o) => o.status === "offered") ?? false;

    return (
      <button
        type="button"
        onClick={() => onOpen(entry)}
        title={
          isHeld && lm?.heldClientName
            ? `Held for ${lm.heldClientName}`
            : lm && lm.eligibleCount > 0
              ? `${lm.eligibleCount} last-minute match${lm.eligibleCount === 1 ? "" : "es"}`
              : "Manage open slot"
        }
        className={cn(
          sizeClass,
          "flex w-full flex-col items-center justify-center rounded-lg border text-center transition",
          isHeld
            ? "border-blue-300 bg-blue-600 active:bg-blue-700"
            : "border-green-200 bg-green-50 active:border-green-300 active:bg-green-100",
          selected &&
            (isHeld
              ? "ring-2 ring-blue-300"
              : "border-green-400 bg-green-100 ring-2 ring-green-300"),
          hasOffer && !isHeld && "ring-1 ring-green-400",
        )}
      >
        <span
          className={cn(
            mobile ? "text-sm font-medium" : compact ? "text-[9px] font-medium leading-tight" : "text-[9px] font-medium",
            isHeld ? "text-white" : "text-green-700",
          )}
        >
          {isHeld ? lm?.heldClientName ?? "Held" : compact ? "Open" : mobile ? "Open slot" : "Open"}
        </span>
        {entry.location && (
          <span
            className={cn(
              subClass,
              "w-full truncate text-center",
              isHeld ? "text-blue-100" : "text-green-600",
            )}
          >
            {entry.location.name}
          </span>
        )}
        {lm && !isHeld && (
          <span className={cn(subClass, "w-full truncate text-center text-green-600")}>
            {lm.eligibleCount > 0
              ? `${lm.eligibleCount} client${lm.eligibleCount === 1 ? "" : "s"}`
              : "No matches"}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "flex flex-col items-center justify-center rounded-lg border border-green-200 bg-green-50",
      )}
    >
      <span className={cn(mobile ? "text-sm font-medium" : compact ? "text-[9px] font-medium" : "text-[9px] font-medium", "text-green-700")}>
        Open
      </span>
      {entry.location && (
        <span className={cn(subClass, "w-full truncate text-center text-green-600")}>
          {entry.location.name}
        </span>
      )}
    </div>
  );
}

function AddSlotModal({
  weekStart,
  dayOfWeek,
  hour,
  locations,
  onConfirm,
  onClose,
  busy,
}: {
  weekStart: string;
  dayOfWeek: number;
  hour: number;
  locations: LocationOption[];
  onConfirm: (locationId: string) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const slotLabel = formatSlotLabel(
    `${formatDate(dateForWeekDay(weekStart, dayOfWeek))}T${formatScheduleHour(hour)}:00`,
  );

  return (
    <SheetModal
      title="Add open slot"
      subtitle={slotLabel}
      onClose={onClose}
      footer={
        <>
          <Button
            className="w-full py-3 sm:py-2"
            disabled={!locationId || busy}
            onClick={() => onConfirm(locationId)}
          >
            {busy ? "Adding…" : "Add slot"}
          </Button>
          <Button variant="secondary" className="w-full py-3 sm:py-2" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="mt-4">
        <LocationSelect
          locations={locations}
          value={locationId}
          onChange={setLocationId}
          disabled={busy}
        />
      </div>
    </SheetModal>
  );
}

function OpenSlotModal({
  entry,
  clients,
  locations,
  lockHours,
  onAllocate,
  onRemove,
  onUpdateLocation,
  onOfferSent,
  onClose,
  busy,
}: {
  entry: ScheduleEntry;
  clients: ClientOption[];
  locations: LocationOption[];
  lockHours: number;
  onAllocate: (slotId: string, clientId: string) => Promise<void>;
  onRemove: (slotId: string) => Promise<void>;
  onUpdateLocation: (slotId: string, locationId: string) => Promise<void>;
  onOfferSent: () => void | Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [locationId, setLocationId] = useState(entry.location?.id ?? locations[0]?.id ?? "");

  useEffect(() => {
    setLocationId(entry.location?.id ?? locations[0]?.id ?? "");
  }, [entry.location?.id, locations]);

  async function saveLocation(nextLocationId: string) {
    if (!nextLocationId || nextLocationId === entry.location?.id) return;
    await onUpdateLocation(entry.slotId, nextLocationId);
  }

  return (
    <SheetModal
      title="Open slot"
      subtitle={formatSlotLabel(entry.startAt)}
      onClose={onClose}
      footer={
        <>
          {clients.length > 0 && (
            <Button
              className="w-full py-3 sm:py-2"
              disabled={!clientId || !locationId || busy}
              onClick={() => onAllocate(entry.slotId, clientId)}
            >
              {busy ? "Saving…" : "Allocate to client"}
            </Button>
          )}
          <Button
            variant="danger"
            className="w-full py-3 sm:py-2"
            disabled={busy}
            onClick={() => onRemove(entry.slotId)}
          >
            Remove slot
          </Button>
          <Button variant="secondary" className="w-full py-3 sm:py-2" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      {entry.lastMinute && (
        <OpenSlotLastMinuteSection
          slotId={entry.slotId}
          lastMinute={entry.lastMinute}
          lockHours={lockHours}
          onOfferSent={onOfferSent}
        />
      )}

      <div className={entry.lastMinute ? "mt-4" : "mt-4"}>
        <h3 className="text-sm font-medium text-slate-900">Direct allocation</h3>
        <p className="mt-1 text-xs text-slate-500">
          Book any client immediately, without the last-minute offer flow.
        </p>
      </div>

      <div className="mt-3">
        <LocationSelect
          locations={locations}
          value={locationId}
          onChange={async (next) => {
            setLocationId(next);
            if (next) await saveLocation(next);
          }}
          disabled={busy}
        />
      </div>

      {clients.length > 0 ? (
        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Client</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-3 text-base sm:py-2 sm:text-sm"
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
    </SheetModal>
  );
}

function ApplyTemplateModal({
  templates,
  onApply,
  onClose,
  applying,
}: {
  templates: TemplateOption[];
  onApply: (templateId: string) => void | Promise<boolean | void>;
  onClose: () => void;
  applying: boolean;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templates[0]?.id ?? "",
  );

  return (
    <SheetModal
      title="Apply template"
      subtitle="Adds any template slots not already on this week."
      onClose={onClose}
      footer={
        <>
          {templates.length > 0 && (
            <Button
              className="w-full py-3 sm:py-2"
              disabled={!selectedTemplateId || applying}
              onClick={() => void onApply(selectedTemplateId)}
            >
              {applying ? "Applying…" : "Apply to this week"}
            </Button>
          )}
          <Button
            variant="secondary"
            className="w-full py-3 sm:py-2"
            disabled={applying}
            onClick={onClose}
          >
            Cancel
          </Button>
        </>
      }
    >
      {templates.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Create a weekly template under Templates to populate this week.
        </p>
      ) : (
        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className="text-slate-600">Template</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-3 text-base sm:py-2 sm:text-sm"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            disabled={applying}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </SheetModal>
  );
}

function MobileDaySchedule({
  weekStart,
  selectedDay,
  hours,
  grid,
  editable,
  busyKey,
  selectedOpenSlot,
  onRequestAdd,
  onOpenSlot,
  nowMs,
}: {
  weekStart: string;
  selectedDay: number;
  hours: number[];
  grid: Map<string, ScheduleEntry>;
  editable: boolean;
  busyKey: string | null;
  selectedOpenSlot: ScheduleEntry | null;
  onRequestAdd?: (dayOfWeek: number, hour: number) => void;
  onOpenSlot: (entry: ScheduleEntry) => void;
  nowMs: number | null;
}) {
  const dateKey = formatDate(dateForWeekDay(weekStart, selectedDay));

  return (
    <div className="space-y-2">
      {hours.map((hour) => {
        const entry = grid.get(`${dateKey}-${hour}`);
        const addKey = `add-${selectedDay}-${hour}`;
        const canAdd =
          editable &&
          onRequestAdd &&
          !entry &&
          !isPastSlot(weekStart, selectedDay, hour, nowMs);

        return (
          <div key={hour} className="flex items-center gap-3">
            <div className="flex w-14 shrink-0 items-center justify-center text-sm tabular-nums text-slate-500">
              {formatScheduleHour(hour)}
            </div>
            <div className="min-w-0 flex-1">
              {entry ? (
                <ScheduleCell
                  entry={entry}
                  editable={
                    editable &&
                    !entry.booking &&
                    entry.status === "available"
                  }
                  onOpen={editable ? onOpenSlot : undefined}
                  selected={selectedOpenSlot?.slotId === entry.slotId}
                  mobile
                />
              ) : canAdd ? (
                <button
                  type="button"
                  disabled={!!busyKey}
                  onClick={() => onRequestAdd(selectedDay, hour)}
                  className={cn(
                    "flex min-h-12 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500 transition active:border-slate-400 active:bg-slate-50",
                    busyKey === addKey && "opacity-50",
                  )}
                >
                  + Add slot
                </button>
              ) : (
                <div className="min-h-12 rounded-lg bg-slate-50" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekGrid({
  weekStart,
  hours,
  grid,
  editable,
  busyKey,
  selectedOpenSlot,
  onRequestAdd,
  onOpenSlot,
  compact = false,
  nowMs,
}: {
  weekStart: string;
  hours: number[];
  grid: Map<string, ScheduleEntry>;
  editable: boolean;
  busyKey: string | null;
  selectedOpenSlot: ScheduleEntry | null;
  onRequestAdd?: (dayOfWeek: number, hour: number) => void;
  onOpenSlot: (entry: ScheduleEntry) => void;
  compact?: boolean;
  nowMs: number | null;
}) {
  const rowHeight = compact ? "h-10" : "h-11";

  return (
    <WeeklyHourGrid
      hours={hours}
      variant={compact ? "compact" : "full"}
      wide={!compact}
      getDayHeader={(day) =>
        compact
          ? dayHeaderInitial(day)
          : {
              primary: day.label,
              secondary: dayHeader(weekStart, day.value).replace(/^\w+\s/, ""),
            }
      }
      renderCell={(dayOfWeek, hour) => {
        const dateKey = formatDate(dateForWeekDay(weekStart, dayOfWeek));
        const entry = grid.get(`${dateKey}-${hour}`);

        if (entry) {
          return (
            <ScheduleCell
              entry={entry}
              editable={
                editable && !entry.booking && entry.status === "available"
              }
              onOpen={editable ? onOpenSlot : undefined}
              selected={selectedOpenSlot?.slotId === entry.slotId}
              compact={compact}
            />
          );
        }

        if (
          editable &&
          onRequestAdd &&
          !isPastSlot(weekStart, dayOfWeek, hour, nowMs)
        ) {
          return (
            <button
              type="button"
              disabled={!!busyKey}
              onClick={() => onRequestAdd(dayOfWeek, hour)}
              title="Add slot"
              className={cn(
                rowHeight,
                "flex w-full items-center justify-center rounded border border-transparent bg-white transition",
                compact
                  ? "border-dashed border-slate-200 active:border-slate-300 active:bg-slate-50"
                  : "group hover:border-slate-300 hover:bg-slate-50",
                busyKey === `add-${dayOfWeek}-${hour}` && "opacity-50",
              )}
            >
              <span
                className={cn(
                  "font-medium text-slate-400",
                  compact
                    ? "text-[10px]"
                    : "text-[9px] text-slate-300 opacity-0 transition group-hover:opacity-100",
                )}
              >
                {compact ? "+" : "+ Add"}
              </span>
            </button>
          );
        }

        return <div className={cn(rowHeight, "bg-white")} />;
      }}
    />
  );
}

export function WeekScheduleCalendar({
  weekStart,
  entries,
  templates,
  onApplyTemplate,
  applyingTemplate,
  scheduleStartTime = "07:00",
  scheduleEndTime = "21:00",
  defaultView = "day",
  lockHours = 1,
  clients = [],
  locations = [],
  onAddSlot,
  onRemoveSlot,
  onAllocateSlot,
  onUpdateSlotLocation,
  onRefresh,
}: {
  weekStart: string;
  entries: ScheduleEntry[];
  templates: TemplateOption[];
  onApplyTemplate?: (templateId: string) => void | Promise<boolean>;
  applyingTemplate?: boolean;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  defaultView?: ScheduleView;
  lockHours?: number;
  clients?: ClientOption[];
  locations?: LocationOption[];
  onAddSlot?: (
    dayOfWeek: number,
    startTime: string,
    locationId: string,
  ) => Promise<void> | void;
  onRemoveSlot?: (slotId: string) => Promise<void> | void;
  onAllocateSlot?: (slotId: string, clientId: string) => Promise<void> | void;
  onUpdateSlotLocation?: (
    slotId: string,
    locationId: string,
  ) => Promise<void> | void;
  onRefresh?: () => void | Promise<void>;
}) {
  const grid = buildScheduleGrid(weekStart, entries);
  const hours = hoursInScheduleRange(scheduleStartTime, scheduleEndTime);
  const editable = !!(onAddSlot || onRemoveSlot || onAllocateSlot);
  const mounted = useMounted();
  const nowMs = mounted ? Date.now() : null;
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedOpenSlot, setSelectedOpenSlot] = useState<ScheduleEntry | null>(null);
  const [pendingAdd, setPendingAdd] = useState<{
    dayOfWeek: number;
    hour: number;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [viewMode, setViewMode] = useState<ScheduleView>(() => defaultView);
  const [isCompactScreen, setIsCompactScreen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    setSelectedDay(defaultSelectedDay(weekStart));
  }, [weekStart, mounted]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsCompactScreen(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setSelectedOpenSlot((prev) => {
      if (!prev) return null;
      return entries.find((e) => e.slotId === prev.slotId) ?? prev;
    });
  }, [entries]);

  async function handleOfferSent() {
    await onRefresh?.();
  }

  async function handleConfirmAdd(locationId: string) {
    if (!pendingAdd || !onAddSlot || busyKey) return;
    const { dayOfWeek, hour } = pendingAdd;
    const key = `add-${dayOfWeek}-${hour}`;
    setBusyKey(key);
    try {
      await onAddSlot(dayOfWeek, formatScheduleHour(hour), locationId);
      setPendingAdd(null);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUpdateLocation(slotId: string, locationId: string) {
    if (!onUpdateSlotLocation || busyKey) return;
    setBusyKey(`location-${slotId}`);
    try {
      await onUpdateSlotLocation(slotId, locationId);
      const loc = locations.find((l) => l.id === locationId);
      setSelectedOpenSlot((prev) =>
        prev && prev.slotId === slotId
          ? {
              ...prev,
              location: loc ? { id: loc.id, name: loc.name } : null,
            }
          : prev,
      );
    } finally {
      setBusyKey(null);
    }
  }

  function requestAdd(dayOfWeek: number, hour: number) {
    if (!onAddSlot || busyKey) return;
    setPendingAdd({ dayOfWeek, hour });
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
  const showApplyTemplate = bookedCount === 0 && !!onApplyTemplate;

  const selectedDayLabel = dayHeader(weekStart, selectedDay);
  const useCompactWeekGrid = isCompactScreen && viewMode === "week";

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:mb-3">
        <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <span className="font-medium text-slate-900">
            {formatDate(parseDateOnly(weekStart))} —{" "}
            {formatDate(addDays(parseDateOnly(weekStart), 6))}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm">{bookedCount} booked</span>
            <span className="text-xs sm:text-sm">{openCount} open</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ScheduleViewToggle value={viewMode} onChange={setViewMode} />
          <div className="flex flex-wrap items-center gap-2">
            {showApplyTemplate && (
              <Button
                variant="secondary"
                disabled={applyingTemplate}
                onClick={() => setApplyTemplateOpen(true)}
              >
                {applyingTemplate ? "Applying…" : "Apply template"}
              </Button>
            )}
            {editable && (
              <span className="text-xs text-slate-500">
                {viewMode === "day"
                  ? "Tap + to add slots · tap open slots to offer or allocate"
                  : useCompactWeekGrid
                    ? "Tap + to add · tap open slots to manage"
                    : "Click empty cells to add · click open slots to offer or allocate"}
              </span>
            )}
          </div>
        </div>
      </div>

      {viewMode === "day" ? (
        <div>
          <div className="mb-4">
            <DayPicker
              weekStart={weekStart}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              hours={hours}
              grid={grid}
            />
          </div>

          <p className="mb-3 text-sm font-medium text-slate-900">{selectedDayLabel}</p>

          <MobileDaySchedule
            weekStart={weekStart}
            selectedDay={selectedDay}
            hours={hours}
            grid={grid}
            editable={editable}
            busyKey={busyKey}
            selectedOpenSlot={selectedOpenSlot}
            onRequestAdd={onAddSlot ? requestAdd : undefined}
            onOpenSlot={openSlotActions}
            nowMs={nowMs}
          />
        </div>
      ) : (
        <WeekGrid
          weekStart={weekStart}
          hours={hours}
          grid={grid}
          editable={editable}
          busyKey={busyKey}
          selectedOpenSlot={selectedOpenSlot}
          onRequestAdd={onAddSlot ? requestAdd : undefined}
          onOpenSlot={openSlotActions}
          compact={useCompactWeekGrid}
          nowMs={nowMs}
        />
      )}

      {applyTemplateOpen && onApplyTemplate && (
        <ApplyTemplateModal
          templates={templates}
          applying={applyingTemplate ?? false}
          onApply={async (templateId) => {
            const result = await onApplyTemplate(templateId);
            if (result !== false) {
              setApplyTemplateOpen(false);
            }
          }}
          onClose={() => !applyingTemplate && setApplyTemplateOpen(false)}
        />
      )}

      {pendingAdd && (
        <AddSlotModal
          weekStart={weekStart}
          dayOfWeek={pendingAdd.dayOfWeek}
          hour={pendingAdd.hour}
          locations={locations}
          onConfirm={handleConfirmAdd}
          onClose={() => !busyKey && setPendingAdd(null)}
          busy={!!busyKey}
        />
      )}

      {selectedOpenSlot && (
        <OpenSlotModal
          entry={selectedOpenSlot}
          clients={clients}
          locations={locations}
          lockHours={lockHours}
          onAllocate={handleAllocate}
          onRemove={handleRemove}
          onUpdateLocation={handleUpdateLocation}
          onOfferSent={handleOfferSent}
          onClose={() => !busyKey && setSelectedOpenSlot(null)}
          busy={!!busyKey}
        />
      )}
    </div>
  );
}
