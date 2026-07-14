import type { ReactNode } from "react";
import { slotOffsetInRange } from "@/lib/schedule-grid";
import { cn } from "@/lib/utils";

export type TimedOverlayItem = {
  key: string;
  startTime: string;
  endTime: string;
  content: ReactNode;
};

/** Absolutely positions timed blocks inside a day column / schedule body. */
export function TimedSlotOverlay({
  scheduleStartTime,
  scheduleEndTime,
  items,
  className,
}: {
  scheduleStartTime: string;
  scheduleEndTime: string;
  items: TimedOverlayItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 overflow-hidden",
        className,
      )}
    >
      {items.map((item) => {
        const offset = slotOffsetInRange(
          scheduleStartTime,
          scheduleEndTime,
          item.startTime,
          item.endTime,
        );
        if (!offset) return null;

        return (
          <div
            key={item.key}
            className="pointer-events-auto absolute left-0.5 right-0.5 min-h-0"
            style={{
              top: `${offset.topPercent}%`,
              height: `${offset.heightPercent}%`,
            }}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
