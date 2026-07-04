import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  WEEK_DAYS,
  formatScheduleHour,
  hourToStartTime,
  scheduleGridTimeLabel,
  type WeekDayColumn,
} from "@/lib/schedule-grid";
import { scheduleGridContentHeight } from "@/components/schedule/useScheduleViewportHeight";

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
  /** When true with full variant, enables wide min-width layout. */
  wide?: boolean;
  /** Override row height for duration-aligned grids (and compact hourly grids). */
  compactRowSize?: string;
  /** Minimum day column width when using the full variant. */
  dayColMin?: string;
  /** Override compact time-column width for duration-aligned grids. */
  compactTimeCol?: string;
  /** Render primary and secondary as separate header rows (date above day label). */
  splitDayHeaderRows?: boolean;
  /** Fixed height — rows expand to fill without internal scroll. */
  viewportHeight?: number;
  /** When true, the day column gets a diagonal hatch (e.g. dates before today). */
  isPastDay?: (dayOfWeek: number) => boolean;
  /** When true, the day column is highlighted as today. */
  isToday?: (dayOfWeek: number) => boolean;
};

export function WeeklyHourGrid({
  hours,
  timeRows,
  variant = "compact",
  columns = WEEK_DAYS,
  getDayHeader,
  renderCell,
  className,
  compactRowSize,
  dayColMin,
  compactTimeCol,
  splitDayHeaderRows = false,
  viewportHeight,
  isPastDay,
  isToday,
}: WeeklyHourGridProps) {
  const compact = variant === "compact";
  const rows = timeRows ?? (hours ?? []).map((hour) => hourToStartTime(hour));
  const durationGrid = !!timeRows;
  const fitViewport = viewportHeight != null;

  const defaultDurationRowSize = compact ? "2rem" : "2.75rem";
  const rowSize = durationGrid
    ? (compactRowSize ?? defaultDurationRowSize)
    : compact
      ? (compactRowSize ?? "2.5rem")
      : "2.75rem";
  const minRowRem = compact ? 2 : 2.75;
  const minRowCss = `${minRowRem}rem`;
  const denseDuration =
    durationGrid && parseFloat(String(compactRowSize ?? defaultDurationRowSize)) < 1.875;
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

  const bodyRowTemplate = fitViewport
    ? `repeat(${rows.length}, minmax(${minRowCss}, 1fr))`
    : `repeat(${rows.length}, ${rowSize})`;
  const gridRowTemplate =
    headerRowCount === 2
      ? `auto auto ${bodyRowTemplate}`
      : `auto ${bodyRowTemplate}`;
  const effectiveHeight =
    fitViewport && viewportHeight != null
      ? scheduleGridContentHeight(
          viewportHeight,
          rows.length,
          minRowRem,
          splitDayHeaderRows ? 56 : 40,
        )
      : undefined;
  const totalGridRows = headerRowCount + rows.length;

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-slate-200",
        fitViewport && "flex min-h-0 flex-col overflow-visible",
        className,
      )}
      style={effectiveHeight != null ? { height: effectiveHeight } : undefined}
    >
      <div
        className={cn(
          "grid w-full min-w-0",
          fitViewport && "min-h-0 flex-1",
        )}
        style={{
          gridTemplateColumns: `${timeCol} repeat(${columns.length}, ${dayCol})`,
          gridTemplateRows: gridRowTemplate,
        }}
      >
        {isPastDay
          ? columns.map((day, dayIndex) => {
              if (!isPastDay(day.value)) return null;

              return (
                <div
                  key={`past-${day.value}`}
                  aria-hidden
                  className="pointer-events-none past-day-hatch"
                  style={{
                    gridColumn: dayIndex + 2,
                    gridRow: `1 / span ${totalGridRows}`,
                  }}
                />
              );
            })
          : null}
        {isToday
          ? columns.map((day, dayIndex) => {
              if (!isToday(day.value)) return null;

              return (
                <div
                  key={`today-${day.value}`}
                  aria-hidden
                  className="pointer-events-none bg-sky-100/40"
                  style={{
                    gridColumn: dayIndex + 2,
                    gridRow: `1 / span ${totalGridRows}`,
                  }}
                />
              );
            })
          : null}
        <div
          style={{
            gridColumn: 1,
            gridRow: headerRowCount === 2 ? "1 / span 2" : 1,
          }}
          className="border-b border-r border-slate-200 bg-slate-50"
        />
        {columns.map((day, dayIndex) => {
          const header = getDayHeader(day);
          const pastDay = isPastDay?.(day.value) ?? false;
          const todayDay = isToday?.(day.value) ?? false;

          if (splitDayHeaderRows) {
            return (
              <div
                key={`head-${day.value}`}
                style={{ gridColumn: dayIndex + 2, gridRow: "1 / span 2" }}
                className={cn(
                  "relative z-[1] flex flex-col items-center justify-center gap-0.5 border-b px-0.5 py-1 text-center",
                  todayDay
                    ? "border-sky-700 bg-slate-900"
                    : "border-slate-200",
                  !todayDay && (pastDay ? "bg-slate-50/70" : "bg-slate-50"),
                )}
              >
                <div
                  className={cn(
                    "font-semibold tabular-nums leading-none",
                    compact ? "text-[10px]" : "text-xs",
                    todayDay ? "text-white" : "text-slate-700",
                  )}
                >
                  {header.primary}
                </div>
                <div
                  className={cn(
                    "font-semibold uppercase leading-none tracking-wide",
                    compact ? "text-[9px]" : "text-[10px]",
                    todayDay ? "text-slate-300" : "text-slate-500",
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
                "relative z-[1] border-b px-0.5 text-center",
                todayDay
                  ? "border-sky-700 bg-slate-900"
                  : "border-slate-200",
                !todayDay && (pastDay ? "bg-slate-50/70" : "bg-slate-50"),
                denseDuration ? "py-1" : "py-2",
              )}
            >
              <div
                className={cn(
                  "font-semibold uppercase tracking-wide",
                  compact ? "text-[10px]" : "text-xs",
                  todayDay ? "text-white" : "text-slate-500",
                )}
              >
                {header.primary}
              </div>
              {header.secondary && (
                <div
                  className={cn(
                    "text-[10px]",
                    todayDay ? "text-slate-300" : "text-slate-400",
                  )}
                >
                  {header.secondary}
                </div>
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
                    : "text-[10px]",
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
                const pastDay = isPastDay?.(day.value) ?? false;
                const todayDay = isToday?.(day.value) ?? false;

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
                      "relative z-[1] min-h-0 min-w-0 overflow-hidden border-slate-100",
                      denseDuration ? "p-0" : "p-0.5",
                      rowIndex > 0 && "border-t",
                      cell.rowSpan > 1 && "relative z-10",
                      !pastDay && !todayDay && "bg-white",
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
