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
        label: "Booked",
      },
      {
        swatch: "relative border border-sky-200 bg-sky-100",
        marker: "R",
        label: "Recurring",
      },
      {
        swatch: "flex items-center justify-center text-[10px] leading-none",
        marker: "🏝️",
        label: "Time off",
      },
    ],
    [
      { swatch: "border border-green-200 bg-green-50", label: "Open" },
      {
        swatch: "border-2 border-green-500 bg-green-50",
        label: "Open with match",
      },
      {
        swatch: "border border-purple-200 bg-purple-100",
        label: "Locked",
      },
    ],
  ];

  return (
    <div className={cn("space-y-2 text-xs text-slate-600", className)}>
      {rows.map((row) => (
        <div
          key={row.map((item) => item.label).join("|")}
          className="flex flex-wrap gap-x-4 gap-y-2"
        >
          {row.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span
                className={cn("relative h-3 w-3 shrink-0 rounded", item.swatch)}
              >
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
