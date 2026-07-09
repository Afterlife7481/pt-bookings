"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";

const AXIS_LOCK_PX = 10;
const SWIPE_DISTANCE_PX = 72;
const SWIPE_VELOCITY = 0.5;
const MAX_ROTATION_DEG = 8;
const EXIT_MS = 200;
const SNAP_BACK_MS = 180;

type Axis = "undecided" | "horizontal" | "vertical";

/**
 * Single-flight day swipe:
 * - drag paints transform directly (no React re-render storm)
 * - release either snaps back, or exits once
 * - day changes only after exit finishes
 * - input stays locked until the parent day/week identity updates
 */
export function DaySwipeDeck({
  weekStart,
  selectedDay,
  dayLabel,
  onShiftDay,
  className,
  children,
  peekLabel,
}: {
  weekStart: string;
  selectedDay: number;
  dayLabel: string;
  onShiftDay: (delta: -1 | 1) => void;
  className?: string;
  children: ReactNode;
  peekLabel?: (delta: -1 | 1) => string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const peekLabelRef = useRef<HTMLParagraphElement>(null);
  const prevStampRef = useRef<HTMLSpanElement>(null);
  const nextStampRef = useRef<HTMLSpanElement>(null);

  const lockedRef = useRef(false);
  const awaitingNavRef = useRef(false);
  const suppressClickRef = useRef(false);
  const onShiftDayRef = useRef(onShiftDay);
  const peekLabelFnRef = useRef(peekLabel);
  const navKeyRef = useRef(`${weekStart}:${selectedDay}`);
  const pointerRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    lastX: number;
    lastT: number;
    axis: Axis;
  } | null>(null);
  const timerRef = useRef<number | null>(null);

  onShiftDayRef.current = onShiftDay;
  peekLabelFnRef.current = peekLabel;

  function clearTimer() {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function width() {
    return rootRef.current?.offsetWidth || 320;
  }

  function setCardInteractive(interactive: boolean) {
    const card = cardRef.current;
    if (card) card.style.pointerEvents = interactive ? "" : "none";
  }

  function paint(x: number, animateMs: number | null) {
    const card = cardRef.current;
    if (!card) return;

    const w = width();
    const progress = Math.max(-1, Math.min(1, x / Math.max(w * 0.5, 1)));
    const rotate = progress * MAX_ROTATION_DEG;

    card.style.transition =
      animateMs == null
        ? "none"
        : `transform ${animateMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    card.style.transform = `translate3d(${x}px, ${Math.abs(progress) * 3}px, 0) rotate(${rotate}deg)`;

    if (prevStampRef.current) {
      prevStampRef.current.style.opacity = progress > 0.12 ? "1" : "0";
      prevStampRef.current.style.transform = `rotate(-14deg) scale(${0.95 + Math.max(progress, 0) * 0.08})`;
    }
    if (nextStampRef.current) {
      nextStampRef.current.style.opacity = progress < -0.12 ? "1" : "0";
      nextStampRef.current.style.transform = `rotate(14deg) scale(${0.95 + Math.max(-progress, 0) * 0.08})`;
    }
    if (peekLabelRef.current) {
      if (Math.abs(progress) < 0.08) {
        peekLabelRef.current.textContent = "Swipe for another day";
      } else {
        const delta: -1 | 1 = progress < 0 ? 1 : -1;
        peekLabelRef.current.textContent =
          peekLabelFnRef.current?.(delta) ??
          (delta === 1 ? "Next day" : "Previous day");
      }
    }
  }

  function settleRest() {
    clearTimer();
    lockedRef.current = false;
    awaitingNavRef.current = false;
    suppressClickRef.current = false;
    pointerRef.current = null;
    setCardInteractive(true);
    paint(0, null);
  }

  // Any day/week identity change settles the deck. This is also what unlocks
  // after a committed swipe (including async week-boundary loads).
  useEffect(() => {
    navKeyRef.current = `${weekStart}:${selectedDay}`;
    settleRest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, selectedDay]);

  useEffect(() => () => clearTimer(), []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (lockedRef.current || awaitingNavRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp,
      axis: "undecided",
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;
    if (
      !pointer ||
      pointer.id !== event.pointerId ||
      lockedRef.current ||
      awaitingNavRef.current
    ) {
      return;
    }

    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;

    if (pointer.axis === "undecided") {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      pointer.axis =
        Math.abs(dx) > Math.abs(dy) * 1.15 ? "horizontal" : "vertical";
      if (pointer.axis === "vertical") {
        pointerRef.current = null;
        return;
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      suppressClickRef.current = true;
    }

    if (pointer.axis !== "horizontal") return;
    event.preventDefault();
    pointer.lastX = event.clientX;
    pointer.lastT = event.timeStamp;
    paint(dx, null);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    pointerRef.current = null;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }

    if (lockedRef.current || awaitingNavRef.current) return;

    if (pointer.axis !== "horizontal") {
      suppressClickRef.current = false;
      paint(0, null);
      return;
    }

    const dx = event.clientX - pointer.startX;
    const dt = Math.max(event.timeStamp - pointer.lastT, 8);
    const velocity = (event.clientX - pointer.lastX) / dt;
    const commit =
      Math.abs(dx) >= SWIPE_DISTANCE_PX || Math.abs(velocity) >= SWIPE_VELOCITY;

    if (!commit) {
      lockedRef.current = true;
      setCardInteractive(false);
      paint(0, SNAP_BACK_MS);
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        settleRest();
      }, SNAP_BACK_MS);
      return;
    }

    const delta: -1 | 1 = dx < 0 ? 1 : -1;
    const fromKey = navKeyRef.current;
    lockedRef.current = true;
    awaitingNavRef.current = true;
    suppressClickRef.current = true;
    setCardInteractive(false);

    const exitX = delta > 0 ? -(width() + 40) : width() + 40;
    paint(exitX, EXIT_MS);

    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onShiftDayRef.current(delta);

      // Same-week updates settle via the weekStart/selectedDay effect.
      // Week-boundary stays locked until the new week arrives.
      // Fallback only recovers from a no-op so the deck can't stick locked.
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (awaitingNavRef.current && navKeyRef.current === fromKey) {
          settleRest();
        }
      }, 1200);
    }, EXIT_MS);
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative isolate overflow-visible", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 opacity-50 shadow-sm"
      >
        <div className="flex h-full items-start justify-center px-4 pt-8">
          <p
            ref={peekLabelRef}
            className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-slate-600 shadow-sm"
          >
            Swipe for another day
          </p>
        </div>
      </div>

      <div
        ref={cardRef}
        className="relative z-[1] touch-pan-y rounded-xl border border-slate-200 bg-white shadow-lg will-change-transform"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
          <p className="text-sm font-medium text-slate-900">{dayLabel}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400 sm:hidden">
            Swipe day
          </p>
        </div>
        <div className="relative p-2 sm:p-3">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-between px-5"
          >
            <span
              ref={prevStampRef}
              className="rounded-md border-2 border-emerald-500 bg-white/95 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-600 opacity-0 shadow-sm"
            >
              Prev
            </span>
            <span
              ref={nextStampRef}
              className="rounded-md border-2 border-sky-500 bg-white/95 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-sky-600 opacity-0 shadow-sm"
            >
              Next
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
