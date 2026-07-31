"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
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

/** Prefer the slide whose center is closest to the viewport center. */
function getActiveSlideIndex(scroller: HTMLElement): number {
  const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;

  Array.from(scroller.children).forEach((child, index) => {
    const element = child as HTMLElement;
    const slideCenter = element.offsetLeft + element.offsetWidth / 2;
    const dist = Math.abs(slideCenter - viewportCenter);
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
  const prevWeekStartRef = useRef(weekStart);
  const weekJustChangedRef = useRef(false);
  const selectedDayRef = useRef(selectedDay);
  const skipScrollToSelectedRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const hasWeekEdges = !!onShiftDay;

  selectedDayRef.current = selectedDay;

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

  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  const onSelectDayRef = useRef(onSelectDay);
  onSelectDayRef.current = onSelectDay;
  const onShiftDayRef = useRef(onShiftDay);
  onShiftDayRef.current = onShiftDay;

  const jumpToDay = useCallback(
    (dayOfWeek: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const index = dayToSlideIndex(dayOfWeek, hasWeekEdges);
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
    },
    [hasWeekEdges],
  );

  const scrollToDay = useCallback(
    (dayOfWeek: number, behavior: ScrollBehavior = "smooth") => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const index = dayToSlideIndex(dayOfWeek, hasWeekEdges);
      const slide = scroller.children[index] as HTMLElement | undefined;
      if (!slide) return;

      programmaticScrollRef.current = true;
      const previousBehavior = scroller.style.scrollBehavior;
      scroller.style.scrollBehavior = "auto";
      scroller.scrollTo({ left: slide.offsetLeft, behavior });
      scroller.style.scrollBehavior = previousBehavior;
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, behavior === "smooth" ? 320 : 0);
    },
    [hasWeekEdges],
  );

  /** Update the day chip as soon as a new day owns the viewport center. */
  const syncSelectedDayFromScroll = useCallback(() => {
    if (programmaticScrollRef.current) return;

    const scroller = scrollerRef.current;
    if (!scroller || scroller.children.length === 0) return;

    const index = getActiveSlideIndex(scroller);
    const slide = slidesRef.current[index];
    if (!slide || slide.type !== "day") return;

    if (slide.dayOfWeek !== selectedDayRef.current) {
      skipScrollToSelectedRef.current = true;
      onSelectDayRef.current(slide.dayOfWeek);
    }
  }, []);

  /** Week edges only commit once the swipe settles. */
  const settleActiveSlide = useCallback(() => {
    if (programmaticScrollRef.current) return;

    const scroller = scrollerRef.current;
    if (!scroller || scroller.children.length === 0) return;

    const index = getActiveSlideIndex(scroller);
    const slide = slidesRef.current[index];
    if (!slide) return;

    if (slide.type === "week-edge") {
      if (edgeHandledRef.current) return;
      edgeHandledRef.current = true;
      onShiftDayRef.current?.(slide.delta);
      return;
    }

    if (slide.dayOfWeek !== selectedDayRef.current) {
      skipScrollToSelectedRef.current = true;
      onSelectDayRef.current(slide.dayOfWeek);
    }
  }, []);

  useLayoutEffect(() => {
    if (prevWeekStartRef.current === weekStart) return;

    prevWeekStartRef.current = weekStart;
    weekJustChangedRef.current = true;
    edgeHandledRef.current = false;
    jumpToDay(selectedDay);
  }, [weekStart, selectedDay, jumpToDay]);

  useEffect(() => {
    if (weekJustChangedRef.current) {
      weekJustChangedRef.current = false;
      return;
    }

    if (skipScrollToSelectedRef.current) {
      skipScrollToSelectedRef.current = false;
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) return;

    const index = dayToSlideIndex(selectedDay, hasWeekEdges);
    const slide = scroller.children[index] as HTMLElement | undefined;
    if (slide && Math.abs(slide.offsetLeft - scroller.scrollLeft) < 2) return;

    scrollToDay(selectedDay, "smooth");
  }, [hasWeekEdges, scrollToDay, selectedDay]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleScroll = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        syncSelectedDayFromScroll();
      });
    };

    const handleScrollEnd = () => {
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      settleActiveSlide();
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });
    scroller.addEventListener("scrollend", handleScrollEnd);

    return () => {
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
      scroller.removeEventListener("scroll", handleScroll);
      scroller.removeEventListener("scrollend", handleScrollEnd);
    };
  }, [settleActiveSlide, syncSelectedDayFromScroll]);

  return (
    <div className={cn(className)}>
      <div
        ref={scrollerRef}
        className="day-schedule-carousel__track flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
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
