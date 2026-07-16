"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { shiftWeekStart } from "@/lib/schedule-utils";
import { cn } from "@/lib/utils";

type WeekSlide = {
  type: "week";
  weekStart: string;
  /** -1 = previous, 0 = current, 1 = next */
  offset: -1 | 0 | 1;
};

function weekSlideIndex(hasNeighbors: boolean): number {
  return hasNeighbors ? 1 : 0;
}

function getActiveSlideIndex(scroller: HTMLElement): number {
  const scrollLeft = scroller.scrollLeft;
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;

  Array.from(scroller.children).forEach((child, index) => {
    const element = child as HTMLElement;
    const dist = Math.abs(element.offsetLeft - scrollLeft);
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });

  return best;
}

export function WeekScheduleCarousel({
  weekStart,
  onChangeWeek,
  className,
  renderWeek,
}: {
  weekStart: string;
  onChangeWeek?: (delta: -1 | 1) => void;
  className?: string;
  renderWeek: (weekStart: string, offset: -1 | 0 | 1) => ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef(false);
  const edgeHandledRef = useRef(false);
  const prevWeekStartRef = useRef(weekStart);
  const hasNeighbors = !!onChangeWeek;

  const slides = useMemo((): WeekSlide[] => {
    if (!hasNeighbors) {
      return [{ type: "week", weekStart, offset: 0 }];
    }
    return [
      {
        type: "week",
        weekStart: shiftWeekStart(weekStart, -1),
        offset: -1,
      },
      { type: "week", weekStart, offset: 0 },
      {
        type: "week",
        weekStart: shiftWeekStart(weekStart, 1),
        offset: 1,
      },
    ];
  }, [hasNeighbors, weekStart]);

  const jumpToWeekSlide = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const index = weekSlideIndex(hasNeighbors);
    const slide = scroller.children[index] as HTMLElement | undefined;
    if (!slide) return;

    programmaticScrollRef.current = true;
    const previousBehavior = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = "auto";
    scroller.scrollLeft = slide.offsetLeft;
    scroller.style.scrollBehavior = previousBehavior;
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 0);
  }, [hasNeighbors]);

  const settleActiveSlide = useCallback(() => {
    if (programmaticScrollRef.current) return;

    const scroller = scrollerRef.current;
    if (!scroller || scroller.children.length === 0) return;

    const index = getActiveSlideIndex(scroller);
    const slide = slides[index];
    if (!slide || slide.offset === 0) return;

    if (edgeHandledRef.current) return;
    edgeHandledRef.current = true;
    onChangeWeek?.(slide.offset);
  }, [onChangeWeek, slides]);

  useLayoutEffect(() => {
    if (prevWeekStartRef.current !== weekStart) {
      prevWeekStartRef.current = weekStart;
      edgeHandledRef.current = false;
    }
    jumpToWeekSlide();
  }, [weekStart, jumpToWeekSlide]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let timeoutId: number | undefined;

    const handleScrollEnd = () => {
      window.clearTimeout(timeoutId);
      settleActiveSlide();
    };

    const handleScroll = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleScrollEnd, 120);
    };

    scroller.addEventListener("scrollend", handleScrollEnd);
    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.clearTimeout(timeoutId);
      scroller.removeEventListener("scrollend", handleScrollEnd);
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [settleActiveSlide]);

  return (
    <div className={cn(className)}>
      <div
        ref={scrollerRef}
        className="day-schedule-carousel__track flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        aria-label="Weekly schedule"
        aria-roledescription="carousel"
      >
        {slides.map((slide) => (
          <div
            key={`${weekStart}-${slide.offset}`}
            className={cn(
              "day-schedule-carousel__slide shrink-0 snap-start snap-always",
              slide.offset !== 0 && "pointer-events-none",
            )}
            aria-roledescription="slide"
            aria-hidden={slide.offset !== 0 ? true : undefined}
            aria-label={
              slide.offset === 0
                ? "This week"
                : slide.offset === 1
                  ? "Next week"
                  : "Previous week"
            }
          >
            {renderWeek(slide.weekStart, slide.offset)}
          </div>
        ))}
      </div>
    </div>
  );
}
