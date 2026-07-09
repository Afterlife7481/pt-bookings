"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { WEEK_DAYS } from "@/lib/schedule-grid";
import { cn } from "@/lib/utils";
import { DAY_VIEW_ORDER } from "./schedule-utils";

type WeekEdgeSlide = { type: "week-edge"; delta: -1 | 1 };
type DaySlide = { type: "day"; dayOfWeek: number };
type CarouselSlide = WeekEdgeSlide | DaySlide;

function dayToSlideIndex(dayOfWeek: number, hasWeekEdges: boolean): number {
  const dayIndex = DAY_VIEW_ORDER.indexOf(
    dayOfWeek as (typeof DAY_VIEW_ORDER)[number],
  );
  const safeIndex = dayIndex === -1 ? 0 : dayIndex;
  return hasWeekEdges ? safeIndex + 1 : safeIndex;
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

export function DayScheduleCarousel({
  weekStart,
  selectedDay,
  onSelectDay,
  onShiftDay,
  className,
  renderDay,
}: {
  weekStart: string;
  selectedDay: number;
  onSelectDay: (dayOfWeek: number) => void;
  onShiftDay?: (delta: -1 | 1) => void;
  className?: string;
  renderDay: (dayOfWeek: number) => ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef(false);
  const edgeHandledRef = useRef(false);
  const hasWeekEdges = !!onShiftDay;

  const slides = useMemo((): CarouselSlide[] => {
    const days: DaySlide[] = WEEK_DAYS.map((day) => ({
      type: "day",
      dayOfWeek: day.value,
    }));

    if (!hasWeekEdges) return days;

    return [
      { type: "week-edge", delta: -1 },
      ...days,
      { type: "week-edge", delta: 1 },
    ];
  }, [hasWeekEdges]);

  const scrollToDay = useCallback(
    (dayOfWeek: number, behavior: ScrollBehavior = "smooth") => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const index = dayToSlideIndex(dayOfWeek, hasWeekEdges);
      const slide = scroller.children[index] as HTMLElement | undefined;
      if (!slide) return;

      programmaticScrollRef.current = true;
      scroller.scrollTo({ left: slide.offsetLeft, behavior });
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, behavior === "smooth" ? 320 : 0);
    },
    [hasWeekEdges],
  );

  const settleActiveSlide = useCallback(() => {
    if (programmaticScrollRef.current) return;

    const scroller = scrollerRef.current;
    if (!scroller || scroller.children.length === 0) return;

    const index = getActiveSlideIndex(scroller);
    const slide = slides[index];
    if (!slide) return;

    if (slide.type === "week-edge") {
      if (edgeHandledRef.current) return;
      edgeHandledRef.current = true;
      onShiftDay?.(slide.delta);
      return;
    }

    if (slide.dayOfWeek !== selectedDay) {
      onSelectDay(slide.dayOfWeek);
    }
  }, [onSelectDay, onShiftDay, selectedDay, slides]);

  useEffect(() => {
    edgeHandledRef.current = false;
    scrollToDay(selectedDay, "auto");
  }, [weekStart, selectedDay, scrollToDay]);

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
        className="day-schedule-carousel__track flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
        aria-label="Daily schedule"
        aria-roledescription="carousel"
      >
        {slides.map((slide) => (
          <div
            key={
              slide.type === "day"
                ? `${weekStart}-${slide.dayOfWeek}`
                : `${weekStart}-week-edge-${slide.delta}`
            }
            className="day-schedule-carousel__slide shrink-0 snap-start snap-always"
            aria-roledescription="slide"
            aria-hidden={slide.type === "week-edge" ? true : undefined}
            aria-label={
              slide.type === "day"
                ? WEEK_DAYS.find((day) => day.value === slide.dayOfWeek)?.longLabel
                : slide.delta === 1
                  ? "Next week"
                  : "Previous week"
            }
          >
            {slide.type === "week-edge" ? (
              <div className="day-schedule-carousel__edge" aria-hidden />
            ) : (
              renderDay(slide.dayOfWeek)
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
