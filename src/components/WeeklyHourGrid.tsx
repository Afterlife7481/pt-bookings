import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  WEEK_DAYS,
  formatScheduleHour,
  type WeekDayColumn,
} from "@/lib/schedule-grid";

export type DayHeaderContent = {
  primary: string;
  secondary?: string;
};

export type WeeklyHourGridVariant = "compact" | "full";

type WeeklyHourGridProps = {
  hours: number[];
  variant?: WeeklyHourGridVariant;
  columns?: readonly WeekDayColumn[];
  getDayHeader: (day: WeekDayColumn) => DayHeaderContent;
  renderCell: (dayOfWeek: number, hour: number) => ReactNode;
  className?: string;
  /** When true with full variant, enables wide min-width + scroll container. */
  wide?: boolean;
  /** Override compact row height (default 2.5rem). */
  compactRowSize?: string;
};

export function WeeklyHourGrid({
  hours,
  variant = "compact",
  columns = WEEK_DAYS,
  getDayHeader,
  renderCell,
  className,
  wide = false,
  compactRowSize,
}: WeeklyHourGridProps) {
  const compact = variant === "compact";
  const rowHeight = compact
    ? compactRowSize
      ? "h-12"
      : "h-10"
    : "h-11";
  const rowSize = compact ? (compactRowSize ?? "2.5rem") : "2.75rem";
  const timeCol = compact ? "1.75rem" : "3.25rem";
  const dayCol = compact ? "minmax(0, 1fr)" : "minmax(4.5rem, 1fr)";

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200",
        compact ? "w-full" : wide ? "max-h-[36rem] overflow-auto" : undefined,
        className,
      )}
    >
      <div
        className={cn("grid w-full", !compact && wide && "min-w-[720px]")}
        style={{
          gridTemplateColumns: `${timeCol} repeat(7, ${dayCol})`,
          gridTemplateRows: `auto repeat(${hours.length}, ${rowSize})`,
        }}
      >
        <div
          className={cn(
            "border-b border-r border-slate-200 bg-slate-50",
            !compact && "sticky left-0 top-0 z-20",
          )}
        />
        {columns.map((day) => {
          const header = getDayHeader(day);
          return (
            <div
              key={`head-${day.value}`}
              className={cn(
                "border-b border-slate-200 bg-slate-50 px-0.5 py-2 text-center",
                !compact && "sticky top-0 z-10",
              )}
            >
              <div
                className={cn(
                  "font-semibold uppercase tracking-wide text-slate-500",
                  compact ? "text-[10px]" : "text-xs",
                )}
              >
                {header.primary}
              </div>
              {header.secondary && (
                <div className="text-[10px] text-slate-400">{header.secondary}</div>
              )}
            </div>
          );
        })}

        {hours.map((hour, hourIndex) => (
          <Fragment key={hour}>
            <div
              className={cn(
                rowHeight,
                "flex items-center justify-center border-r border-slate-200 bg-slate-50 text-center tabular-nums text-slate-400",
                compact ? "text-[9px]" : "sticky left-0 z-10 text-[10px]",
                hourIndex > 0 && "border-t border-slate-100",
              )}
            >
              {compact ? hour : formatScheduleHour(hour)}
            </div>
            {columns.map((day) => (
              <div
                key={`${day.value}-${hour}`}
                className={cn(
                  rowHeight,
                  "border-slate-100 p-0.5",
                  hourIndex > 0 && "border-t",
                )}
              >
                {renderCell(day.value, hour)}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
