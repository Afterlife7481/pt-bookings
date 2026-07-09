"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { WEEK_DAYS } from "@/lib/schedule-grid";
import { cn } from "@/lib/utils";
import { DAY_VIEW_ORDER } from "./schedule-utils";

const BOUNDARY_SWIPE_PX = 56;

function dayToSlideIndex(dayOfWeek: number): number {
  const dayIndex = DAY_VIEW_ORDER.indexOf(
    dayOfWeek as (typeof DAY_VIEW_ORDER)[number],
  );
  return dayIndex === -1 ? 0 : dayIndex;
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
  const boundaryHandledRef = useRef(false);
  const gestureRef = useRef<{
    startDayIndex: number;
    originX: number;
    active: boolean;
  } | null>(null);

  const scrollToDay = useCallback(
    (dayOfWeek: number, behavior: ScrollBehavior = "smooth") => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const index = dayToSlideIndex(dayOfWeek);
      const slide = scroller.children[index] as HTMLElement | undefined;
      if (!slide) return;

      programmaticScrollRef.current = true;
      scroller.scrollTo({ left: slide.offsetLeft, behavior });
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, behavior === "smooth" ? 320 : 0);
    },
    [],
  );

  const settleActiveSlide = useCallback(() => {
    if (programmaticScrollRef.current) return;

    const scroller = scrollerRef.current;
    if (!scroller || scroller.children.length === 0) return;

    const slideWidth = scroller.clientWidth;
    if (slideWidth <= 0) return;

    const index = Math.round(scroller.scrollLeft / slideWidth);
    const dayOfWeek = DAY_VIEW_ORDER[index];
    if (dayOfWeek == null) return;

    if (dayOfWeek !== selectedDay) {
      onSelectDay(dayOfWeek);
    }
  }, [onSelectDay, selectedDay]);

  useEffect(() => {
    boundaryHandledRef.current = false;
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

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !onShiftDay) return;

    function startGesture(clientX: number) {
      const startDayIndex = DAY_VIEW_ORDER.indexOf(
        selectedDay as (typeof DAY_VIEW_ORDER)[number],
      );
      gestureRef.current = {
        startDayIndex: startDayIndex === -1 ? 0 : startDayIndex,
        originX: clientX,
        active: true,
      };
      boundaryHandledRef.current = false;
    }

    function moveGesture(clientX: number) {
      const gesture = gestureRef.current;
      if (!gesture?.active || boundaryHandledRef.current) return;

      const dx = clientX - gesture.originX;
      const lastDayIndex = DAY_VIEW_ORDER.length - 1;

      if (gesture.startDayIndex === lastDayIndex && dx < -BOUNDARY_SWIPE_PX) {
        boundaryHandledRef.current = true;
        onShiftDay(1);
        return;
      }

      if (gesture.startDayIndex === 0 && dx > BOUNDARY_SWIPE_PX) {
        boundaryHandledRef.current = true;
        onShiftDay(-1);
      }
    }

    function endGesture() {
      gestureRef.current = null;
    }

    const onTouchStart = (event: TouchEvent) => {
      startGesture(event.touches[0]?.clientX ?? 0);
    };
    const onTouchMove = (event: TouchEvent) => {
      moveGesture(event.touches[0]?.clientX ?? 0);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      startGesture(event.clientX);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && !(event.buttons & 1)) return;
      moveGesture(event.clientX);
    };

    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: true });
    scroller.addEventListener("touchend", endGesture);
    scroller.addEventListener("pointerdown", onPointerDown);
    scroller.addEventListener("pointermove", onPointerMove);
    scroller.addEventListener("pointerup", endGesture);
    scroller.addEventListener("pointercancel", endGesture);

    return () => {
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("touchend", endGesture);
      scroller.removeEventListener("pointerdown", onPointerDown);
      scroller.removeEventListener("pointermove", onPointerMove);
      scroller.removeEventListener("pointerup", endGesture);
      scroller.removeEventListener("pointercancel", endGesture);
    };
  }, [onShiftDay, selectedDay]);

  return (
    <div className={cn(className)}>
      <div
        ref={scrollerRef}
        className="day-schedule-carousel__track flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
        aria-label="Daily schedule"
        aria-roledescription="carousel"
      >
        {WEEK_DAYS.map((day) => (
          <div
            key={`${weekStart}-${day.value}`}
            className="day-schedule-carousel__slide w-full shrink-0 snap-start snap-always"
            aria-roledescription="slide"
            aria-label={day.longLabel}
          >
            {renderDay(day.value)}
          </div>
        ))}
      </div>
    </div>
  );
}
