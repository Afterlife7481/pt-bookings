import { cn } from "@/lib/utils";

export function ScheduleLegend({ className }: { className?: string }) {
  const rows: {
    swatch: string;
    label: string;
    marker?: string;
  }[][] = [
    [
      {
        swatch: "border border-sky-200 bg-sky-100",
        label: "Booked slot",
      },
      {
        swatch: "relative border border-sky-200 bg-sky-100",
        marker: "R",
        label: "Recurring slot",
      },
    ],
    [
      { swatch: "border border-green-200 bg-green-50", label: "Open slot" },
      {
        swatch: "border-2 border-green-500 bg-green-50",
        label: "Open slot with match",
      },
    ],
    [
      {
        swatch: "border border-purple-400 bg-purple-600",
        label: "Locked slot",
      },
      {
        swatch: "past-day-hatch border border-red-200",
        label: "Past day",
      },
      {
        swatch: "flex items-center justify-center border border-emerald-200 bg-emerald-50 text-[10px] leading-none",
        marker: "🏝️",
        label: "Time off",
      },
    ],
  ];

  return (
    <div className={cn("space-y-2 text-xs text-slate-600", className)}>
      {rows.map((row) => (
        <div key={row.map((item) => item.label).join("|")} className="flex flex-wrap gap-x-4 gap-y-2">
          {row.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className={cn("relative h-3 w-3 shrink-0 rounded", item.swatch)}>
                {item.marker === "R" ? (
                  <span className="absolute right-px top-px text-[6px] font-semibold leading-none text-sky-700">
                    R
                  </span>
                ) : item.marker ? (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] leading-none">
                    {item.marker}
                  </span>
                ) : null}
              </span>
              {item.label}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
