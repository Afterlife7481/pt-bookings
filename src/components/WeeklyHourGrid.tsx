import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  WEEK_DAYS,
  formatScheduleHour,
  hourToStartTime,
  scheduleGridTimeLabel,
  type WeekDayColumn,
} from "@/lib/schedule-grid";

export type DayHeaderContent = {
  primary: string;
  secondary?: string;
};

export type WeeklyHourGridVariant = "compact" | "full";

/** Flush week grid against a zero-padding card; pair with padded controls above/below. */
export const WEEK_GRID_EDGE_CLASS =
  "!w-full !rounded-none !border-x-0 !border-b-0 border-t border-slate-200 max-sm:!border-0";

export type WeeklyHourGridCell =
  | ReactNode
  | {
      content: ReactNode;
      rowSpan: number;
    }
  | { covered: true };

export function normalizeWeeklyHourGridCell(cell: WeeklyHourGridCell): {
  content: ReactNode | null;
  rowSpan: number;
  covered: boolean;
} {
  if (cell && typeof cell === "object" && "covered" in cell && cell.covered) {
    return { content: null, rowSpan: 1, covered: true };
  }
  if (cell && typeof cell === "object" && "rowSpan" in cell) {
    return {
      content: cell.content,
      rowSpan: cell.rowSpan,
      covered: false,
    };
  }
  return { content: cell as ReactNode, rowSpan: 1, covered: false };
}

type WeeklyHourGridProps = {
  /** Hour integers — one row per hour at :00. */
  hours?: number[];
  /** Explicit row times (e.g. 07:00, 07:30) for duration-aligned grids. */
  timeRows?: string[];
  variant?: WeeklyHourGridVariant;
  columns?: readonly WeekDayColumn[];
  getDayHeader: (day: WeekDayColumn) => DayHeaderContent;
  renderCell: (dayOfWeek: number, rowTime: string) => WeeklyHourGridCell;
  className?: string;
  /** When true with full variant, enables wide min-width + scroll container. */
  wide?: boolean;
  /** Override row height for duration-aligned grids (and compact hourly grids). */
  compactRowSize?: string;
  /** Minimum day column width when using the full variant. */
  dayColMin?: string;
  /** Override compact time-column width for duration-aligned grids. */
  compactTimeCol?: string;
  /** Render primary and secondary as separate header rows (date above day label). */
  splitDayHeaderRows?: boolean;
};

export function WeeklyHourGrid({
  hours,
  timeRows,
  variant = "compact",
  columns = WEEK_DAYS,
  getDayHeader,
  renderCell,
  className,
  wide = false,
  compactRowSize,
  dayColMin,
  compactTimeCol,
  splitDayHeaderRows = false,
}: WeeklyHourGridProps) {
  const compact = variant === "compact";
  const rows = timeRows ?? (hours ?? []).map((hour) => hourToStartTime(hour));
  const durationGrid = !!timeRows;

  const defaultDurationRowSize = compact ? "1.625rem" : "2.75rem";
  const rowSize = durationGrid
    ? (compactRowSize ?? defaultDurationRowSize)
    : compact
      ? (compactRowSize ?? "2.5rem")
      : "2.75rem";
  const denseDuration =
    durationGrid && parseFloat(rowSize) < 2;
  const compactTimeLabels = compact || denseDuration;

  const rowHeight = compact ? (compactRowSize ? "h-12" : "h-10") : "h-11";
  const timeCol = compact
    ? durationGrid
      ? (compactTimeCol ?? "1.625rem")
      : "1.75rem"
    : denseDuration
      ? "2.5rem"
      : "3.25rem";
  const dayCol = compact
    ? "minmax(0, 1fr)"
    : `minmax(${dayColMin ?? "4.5rem"}, 1fr)`;
  const headerRowCount = splitDayHeaderRows && columns.length > 0 ? 2 : 1;
  const bodyRowOffset = headerRowCount + 1;
  const timeLabelColor = splitDayHeaderRows ? "text-slate-700" : "text-slate-500";

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
          gridTemplateColumns: `${timeCol} repeat(${columns.length}, ${dayCol})`,
          gridTemplateRows:
            headerRowCount === 2
              ? `auto auto repeat(${rows.length}, ${rowSize})`
              : `auto repeat(${rows.length}, ${rowSize})`,
        }}
      >
        <div
          style={{
            gridColumn: 1,
            gridRow: headerRowCount === 2 ? "1 / span 2" : 1,
          }}
          className={cn(
            "border-b border-r border-slate-200 bg-slate-50",
            !compact && "sticky left-0 top-0 z-20",
          )}
        />
        {columns.map((day, dayIndex) => {
          const header = getDayHeader(day);

          if (splitDayHeaderRows) {
            return (
              <div
                key={`head-${day.value}`}
                style={{ gridColumn: dayIndex + 2, gridRow: "1 / span 2" }}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 border-b border-slate-200 bg-slate-50 px-0.5 py-1 text-center",
                  !compact && "sticky top-0 z-10",
                )}
              >
                <div
                  className={cn(
                    "font-semibold tabular-nums leading-none text-slate-700",
                    compact ? "text-[10px]" : "text-xs",
                  )}
                >
                  {header.primary}
                </div>
                <div
                  className={cn(
                    "font-semibold uppercase leading-none tracking-wide text-slate-500",
                    compact ? "text-[9px]" : "text-[10px]",
                  )}
                >
                  {header.secondary ?? header.primary}
                </div>
              </div>
            );
          }

          return (
            <div
              key={`head-${day.value}`}
              style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
              className={cn(
                "border-b border-slate-200 bg-slate-50 px-0.5 text-center",
                denseDuration ? "py-1" : "py-2",
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

        {rows.map((rowTime, rowIndex) => {
          const gridRow = rowIndex + bodyRowOffset;
          const isHalfHour = durationGrid && rowTime.endsWith(":30");

          return (
            <Fragment key={rowTime}>
              <div
                style={{ gridColumn: 1, gridRow }}
                className={cn(
                  durationGrid ? "min-h-0" : rowHeight,
                  "flex items-start justify-center border-r border-slate-200 bg-slate-50 pt-0.5 text-center tabular-nums",
                  isHalfHour
                    ? "text-slate-400"
                    : cn("font-semibold", timeLabelColor),
                  compactTimeLabels
                    ? "text-[9px]"
                    : "sticky left-0 z-10 text-[10px]",
                  rowIndex > 0 && "border-t border-slate-100",
                )}
              >
                {durationGrid
                  ? scheduleGridTimeLabel(rowTime, compactTimeLabels)
                  : compact
                    ? String(hourFromRowTime(rowTime))
                    : formatScheduleHour(hourFromRowTime(rowTime))}
              </div>
              {columns.map((day, dayIndex) => {
                const cell = normalizeWeeklyHourGridCell(
                  renderCell(day.value, rowTime),
                );

                if (cell.covered) {
                  return null;
                }

                return (
                  <div
                    key={`${day.value}-${rowTime}`}
                    style={{
                      gridColumn: dayIndex + 2,
                      gridRow:
                        cell.rowSpan > 1
                          ? `${gridRow} / span ${cell.rowSpan}`
                          : gridRow,
                    }}
                    className={cn(
                      "min-h-0 min-w-0 overflow-hidden border-slate-100",
                      denseDuration ? "p-0" : "p-0.5",
                      rowIndex > 0 && "border-t",
                      cell.rowSpan > 1 && "relative z-10",
                    )}
                  >
                    <div className="h-full min-h-0 min-w-0">{cell.content}</div>
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function hourFromRowTime(rowTime: string): number {
  return parseInt(rowTime.split(":")[0] ?? "0", 10);
}
