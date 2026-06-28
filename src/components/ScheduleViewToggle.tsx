import { cn } from "@/lib/utils";

export type ScheduleView = "day" | "week";

export function ScheduleViewToggle({
  value,
  onChange,
}: {
  value: ScheduleView;
  onChange: (view: ScheduleView) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
      role="tablist"
      aria-label="Schedule view"
    >
      {(["day", "week"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={value === mode}
          onClick={() => onChange(mode)}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition",
            value === mode
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 active:bg-slate-100",
          )}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}
