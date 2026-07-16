"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type WeekEdgeSlide = { type: "week-edge"; delta: -1 | 1 };
type WeekSlide = { type: "week" };
type CarouselSlide = WeekEdgeSlide | WeekSlide;

function weekSlideIndex(hasWeekEdges: boolean): number {
  return hasWeekEdges ? 1 : 0;
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
  children,
}: {
  weekStart: string;
  onChangeWeek?: (delta: -1 | 1) => void;
  className?: string;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef(false);
  const edgeHandledRef = useRef(false);
  const prevWeekStartRef = useRef(weekStart);
  const hasWeekEdges = !!onChangeWeek;

  const slides = useMemo((): CarouselSlide[] => {
    if (!hasWeekEdges) return [{ type: "week" }];
    return [
      { type: "week-edge", delta: -1 },
      { type: "week" },
      { type: "week-edge", delta: 1 },
    ];
  }, [hasWeekEdges]);

  const jumpToWeekSlide = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const index = weekSlideIndex(hasWeekEdges);
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
  }, [hasWeekEdges]);

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
      onChangeWeek?.(slide.delta);
    }
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
            key={
              slide.type === "week"
                ? `${weekStart}-week`
                : `${weekStart}-week-edge-${slide.delta}`
            }
            className="day-schedule-carousel__slide shrink-0 snap-start snap-always"
            aria-roledescription="slide"
            aria-hidden={slide.type === "week-edge" ? true : undefined}
            aria-label={
              slide.type === "week"
                ? "This week"
                : slide.delta === 1
                  ? "Next week"
                  : "Previous week"
            }
          >
            {slide.type === "week-edge" ? (
              <div className="day-schedule-carousel__edge" aria-hidden />
            ) : (
              children
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
