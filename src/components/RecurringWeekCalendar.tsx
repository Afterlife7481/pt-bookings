import { Fragment } from "react";
import { cn } from "@/lib/utils";

export type RecurringSlotOption = {
  dayOfWeek: number;
  startTime: string;
  available: boolean;
  heldBy: { clientId: string; clientName: string } | null;
  isCurrentClient: boolean;
};

/** Monday first */
const WEEK_DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_HEIGHT = "h-11";

export function slotKey(dayOfWeek: number, startTime: string) {
  return `${dayOfWeek}-${startTime}`;
}

export function parseSlotKey(key: string): { dayOfWeek: number; startTime: string } {
  const dash = key.indexOf("-");
  return {
    dayOfWeek: Number(key.slice(0, dash)),
    startTime: key.slice(dash + 1),
  };
}

function hourFromTime(startTime: string): number {
  return parseInt(startTime.split(":")[0] ?? "0", 10);
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function buildSlotGrid(options: RecurringSlotOption[]) {
  const map = new Map<string, RecurringSlotOption>();
  for (const option of options) {
    map.set(`${option.dayOfWeek}-${hourFromTime(option.startTime)}`, option);
  }
  return map;
}

function SlotCell({
  option,
  selected,
  onToggle,
}: {
  option: RecurringSlotOption;
  selected: boolean;
  onToggle: (key: string) => void;
}) {
  const key = slotKey(option.dayOfWeek, option.startTime);
  const disabled = !option.available;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(key)}
      title={
        option.heldBy && !option.isCurrentClient
          ? `Booked by ${option.heldBy.clientName}`
          : option.startTime
      }
      className={cn(
        `${ROW_HEIGHT} w-full rounded border px-1 py-0.5 text-left transition`,
        disabled && "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60",
        !disabled &&
          selected &&
          "border-slate-900 bg-slate-900 text-white ring-1 ring-slate-900",
        !disabled &&
          !selected &&
          option.isCurrentClient &&
          "border-green-300 bg-green-50",
        !disabled &&
          !selected &&
          !option.isCurrentClient &&
          "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50",
      )}
    >
      <span className="block truncate text-[10px] font-medium leading-tight">
        {selected ? (
          <span className="text-white">Selected</span>
        ) : option.isCurrentClient ? (
          <span className="text-green-700">Saved</span>
        ) : option.heldBy ? (
          <span className="text-amber-700">{option.heldBy.clientName.split(" ")[0]}</span>
        ) : (
          <span className="text-green-600">Open</span>
        )}
      </span>
    </button>
  );
}

export function RecurringWeekCalendar({
  options,
  selectedSlotKeys,
  onToggle,
}: {
  options: RecurringSlotOption[];
  selectedSlotKeys: Set<string>;
  onToggle: (key: string) => void;
}) {
  const slotGrid = buildSlotGrid(options);

  return (
    <div className="mt-4 max-h-[36rem] overflow-auto rounded-lg border border-slate-200">
      <div
        className="grid min-w-[720px]"
        style={{
          gridTemplateColumns: "3.25rem repeat(7, minmax(4.5rem, 1fr))",
          gridTemplateRows: `auto repeat(${HOURS.length}, 2.75rem)`,
        }}
      >
        <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50" />
        {WEEK_DAYS.map((day) => (
          <div
            key={`head-${day.value}`}
            className="border-b border-slate-200 bg-slate-50 px-1 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {day.label}
          </div>
        ))}

        {HOURS.map((hour) => (
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
              const option = slotGrid.get(`${day.value}-${hour}`);
              return (
                <div
                  key={`${day.value}-${hour}`}
                  className={cn(
                    ROW_HEIGHT,
                    "border-slate-100 p-0.5",
                    hour > 0 && "border-t",
                  )}
                >
                  {option ? (
                    <SlotCell
                      option={option}
                      selected={selectedSlotKeys.has(
                        slotKey(option.dayOfWeek, option.startTime),
                      )}
                      onToggle={onToggle}
                    />
                  ) : (
                    <div
                      className={cn(
                        ROW_HEIGHT,
                        "rounded border border-transparent bg-slate-50/40",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
