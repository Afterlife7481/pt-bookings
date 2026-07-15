import { cn } from "@/lib/utils";

export function ScheduleLegend({ className }: { className?: string }) {
  const items = [
    {
      swatch: "border border-slate-500 bg-slate-800",
      label: "Booked slot",
    },
    {
      swatch: "border-2 border-sky-300 bg-slate-800",
      label: "Recurring booked",
    },
    { swatch: "border border-green-200 bg-green-50", label: "Open slot" },
    {
      swatch: "border-2 border-green-500 bg-green-50",
      label: "Open slot with last-minute match",
    },
    {
      swatch: "border border-purple-400 bg-purple-600",
      label: "Locked offer",
    },
    {
      swatch: "past-day-hatch border border-red-200",
      label: "Past day",
    },
    {
      swatch: "holiday-hatch border border-slate-300",
      label: "Time off (blocked slots)",
    },
  ] as const;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600",
        className,
      )}
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={cn("h-3 w-3 shrink-0 rounded", item.swatch)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
