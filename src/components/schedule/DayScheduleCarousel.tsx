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

type DaySlide = { type: "day"; dayOfWeek: number };
type EdgeSlide = { type: "edge"; delta: -1 | 1; label: string };
type CarouselSlide = DaySlide | EdgeSlide;

function dayToSlideIndex(dayOfWeek: number, hasEdges: boolean): number {
  const dayIndex = DAY_VIEW_ORDER.indexOf(
    dayOfWeek as (typeof DAY_VIEW_ORDER)[number],
  );
  const safeIndex = dayIndex === -1 ? 0 : dayIndex;
  return hasEdges ? safeIndex + 1 : safeIndex;
}

export function DayScheduleCarousel({
  weekStart,
  selectedDay,
  onSelectDay,
  onShiftDay,
  peekLabel,
  enableWeekEdges = false,
  className,
  renderDay,
}: {
  weekStart: string;
  selectedDay: number;
  onSelectDay: (dayOfWeek: number) => void;
  onShiftDay?: (delta: -1 | 1) => void;
  peekLabel?: (delta: -1 | 1) => string;
  enableWeekEdges?: boolean;
  className?: string;
  renderDay: (dayOfWeek: number) => ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef(false);
  const edgeHandledRef = useRef(false);
  const hasEdges = enableWeekEdges && !!onShiftDay;

  const slides = useMemo((): CarouselSlide[] => {
    const days: DaySlide[] = WEEK_DAYS.map((day) => ({
      type: "day",
      dayOfWeek: day.value,
    }));
    if (!hasEdges) return days;

    return [
      {
        type: "edge",
        delta: -1,
        label: peekLabel?.(-1) ?? "Previous day",
      },
      ...days,
      {
        type: "edge",
        delta: 1,
        label: peekLabel?.(1) ?? "Next day",
      },
    ];
  }, [hasEdges, peekLabel]);

  const scrollToDay = useCallback(
    (dayOfWeek: number, behavior: ScrollBehavior = "smooth") => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const index = dayToSlideIndex(dayOfWeek, hasEdges);
      const slide = scroller.children[index] as HTMLElement | undefined;
      if (!slide) return;

      programmaticScrollRef.current = true;
      scroller.scrollTo({ left: slide.offsetLeft, behavior });
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, behavior === "smooth" ? 320 : 0);
    },
    [hasEdges],
  );

  const settleActiveSlide = useCallback(() => {
    if (programmaticScrollRef.current) return;

    const scroller = scrollerRef.current;
    if (!scroller || scroller.children.length === 0) return;

    const mid = scroller.scrollLeft + scroller.clientWidth / 2;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    Array.from(scroller.children).forEach((child, index) => {
      const element = child as HTMLElement;
      const center = element.offsetLeft + element.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });

    const slide = slides[best];
    if (!slide) return;

    if (slide.type === "edge") {
      if (edgeHandledRef.current) return;
      edgeHandledRef.current = true;
      onShiftDay?.(slide.delta);
      window.setTimeout(() => {
        edgeHandledRef.current = false;
      }, 600);
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
    <div className={cn("space-y-3", className)}>
      <div
        ref={scrollerRef}
        className="day-schedule-carousel__track -mx-1 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-1"
        aria-label="Daily schedule"
        aria-roledescription="carousel"
      >
        {slides.map((slide, index) => (
          <div
            key={
              slide.type === "day"
                ? `${weekStart}-${slide.dayOfWeek}`
                : `${weekStart}-edge-${slide.delta}`
            }
            className={cn(
              "day-schedule-carousel__slide shrink-0 snap-center snap-always",
              slide.type === "edge"
                ? "w-[min(30vw,6.5rem)]"
                : "w-full",
            )}
            aria-roledescription="slide"
            aria-label={
              slide.type === "day"
                ? `Day ${index + 1} of ${slides.length}`
                : slide.label
            }
          >
            {slide.type === "edge" ? (
              <div className="flex h-full min-h-[10rem] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-2 text-center text-xs font-medium leading-snug text-slate-500">
                {slide.label}
              </div>
            ) : (
              renderDay(slide.dayOfWeek)
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] text-slate-400 sm:hidden">
        Swipe between days
      </p>
    </div>
  );
}
