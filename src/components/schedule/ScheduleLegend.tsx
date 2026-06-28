import { cn } from "@/lib/utils";

export function ScheduleLegend() {
  const items = [
    { swatch: "bg-blue-600", label: "Recurring slot" },
    { swatch: "bg-slate-800", label: "Booked slot" },
    { swatch: "border border-green-200 bg-green-50", label: "Open slot" },
    {
      swatch: "border border-amber-200 bg-amber-50",
      label: "Open slot with last-minute match",
    },
    {
      swatch: "border border-purple-400 bg-purple-600",
      label: "Locked offer",
    },
  ] as const;

  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={cn("h-3 w-3 shrink-0 rounded", item.swatch)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
