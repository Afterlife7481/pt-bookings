"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD_PX = 88;
const SWIPE_VELOCITY = 0.55;
const MAX_ROTATION_DEG = 9;
const EXIT_MS = 200;
const ENTER_MS = 240;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastT: number;
  axis: "undecided" | "horizontal" | "vertical";
};

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
  const deckRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const busyRef = useRef(false);
  const suppressClickRef = useRef(false);
  const skipTransitionRef = useRef(false);
  const swipeGenRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [deckWidth, setDeckWidth] = useState(320);

  useEffect(() => {
    const node = deckRef.current;
    if (!node) return;
    const update = () => setDeckWidth(node.offsetWidth || 320);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Picker / week-button navigation: snap flat without fighting an in-flight swipe.
  useEffect(() => {
    if (busyRef.current) return;
    skipTransitionRef.current = true;
    setDragX(0);
    setDragging(false);
    const id = window.requestAnimationFrame(() => {
      skipTransitionRef.current = false;
    });
    return () => window.cancelAnimationFrame(id);
  }, [weekStart, selectedDay]);

  const commitSwipe = useCallback(
    (delta: -1 | 1) => {
      if (busyRef.current) return;
      busyRef.current = true;
      suppressClickRef.current = true;
      setDragging(false);

      const gen = ++swipeGenRef.current;
      // Continue in the finger direction: next exits left, previous exits right.
      const exitX = delta > 0 ? -(deckWidth + 48) : deckWidth + 48;
      skipTransitionRef.current = false;
      setDragX(exitX);

      // Advance the day immediately so the picker stays in sync.
      onShiftDay(delta);

      window.setTimeout(() => {
        if (swipeGenRef.current !== gen) return;

        // Place the new day just off-screen on the arrival edge, then ease in.
        // next arrives from the right; previous arrives from the left.
        skipTransitionRef.current = true;
        setDragX(delta > 0 ? deckWidth * 0.34 : -deckWidth * 0.34);

        window.requestAnimationFrame(() => {
          if (swipeGenRef.current !== gen) return;
          skipTransitionRef.current = false;
          setDragX(0);
          window.setTimeout(() => {
            if (swipeGenRef.current !== gen) return;
            busyRef.current = false;
          }, ENTER_MS);
        });
      }, EXIT_MS);
    },
    [onShiftDay, deckWidth],
  );

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (busyRef.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp,
      axis: "undecided",
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || busyRef.current) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (drag.axis === "undecided") {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      drag.axis =
        Math.abs(dx) > Math.abs(dy) * 1.2 ? "horizontal" : "vertical";
      if (drag.axis === "vertical") {
        dragRef.current = null;
        setDragging(false);
        setDragX(0);
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          /* already released */
        }
        return;
      }
      setDragging(true);
      suppressClickRef.current = true;
    }

    if (drag.axis !== "horizontal") return;

    event.preventDefault();
    drag.lastX = event.clientX;
    drag.lastT = event.timeStamp;
    setDragX(dx);
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }

    if (drag.axis !== "horizontal" || busyRef.current) {
      setDragging(false);
      setDragX(0);
      if (drag.axis !== "horizontal") {
        suppressClickRef.current = false;
      }
      return;
    }

    const dx = event.clientX - drag.startX;
    const elapsed = Math.max(event.timeStamp - drag.lastT, 8);
    const recentVelocity = (event.clientX - drag.lastX) / elapsed;
    const overallVelocity =
      dx / Math.max(event.timeStamp - (drag.lastT - elapsed), 16);
    const velocity =
      Math.abs(recentVelocity) > Math.abs(overallVelocity)
        ? recentVelocity
        : overallVelocity;

    const shouldSwipe =
      Math.abs(dx) >= SWIPE_THRESHOLD_PX || Math.abs(velocity) >= SWIPE_VELOCITY;

    if (!shouldSwipe) {
      setDragging(false);
      setDragX(0);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      return;
    }

    commitSwipe(dx < 0 ? 1 : -1);
  }

  function onClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  const progress = Math.max(-1, Math.min(1, dragX / Math.max(deckWidth * 0.5, 1)));
  const rotate = progress * MAX_ROTATION_DEG;
  const peekDelta: -1 | 1 | null =
    Math.abs(progress) < 0.08 ? null : progress < 0 ? 1 : -1;
  const peekScale = 0.94 + Math.min(Math.abs(progress), 1) * 0.06;

  const cardStyle: CSSProperties = {
    transform: `translate3d(${dragX}px, ${Math.abs(progress) * 4}px, 0) rotate(${rotate}deg)`,
    transition:
      dragging || skipTransitionRef.current
        ? "none"
        : `transform ${ENTER_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    willChange: "transform",
  };

  return (
    <div
      ref={deckRef}
      className={cn("relative isolate overflow-visible", className)}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 shadow-sm",
          "transition-[opacity,transform] duration-150",
          peekDelta != null ? "opacity-100" : "opacity-50",
        )}
        style={{ transform: `scale(${peekScale})` }}
      >
        <div className="flex h-full items-start justify-center px-4 pt-8">
          <p className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
            {peekDelta == null
              ? "Swipe for another day"
              : (peekLabel?.(peekDelta) ??
                (peekDelta === 1 ? "Next day" : "Previous day"))}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "relative z-[1] overflow-visible touch-pan-y rounded-xl border border-slate-200 bg-white shadow-lg",
          dragging && "cursor-grabbing select-none",
          !dragging && "cursor-grab",
        )}
        style={cardStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onClickCapture={onClickCapture}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
          <p className="text-sm font-medium text-slate-900">{dayLabel}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-400 sm:hidden">
            Swipe day
          </p>
        </div>
        <div className="relative p-2 sm:p-3">
          {/* Stamps sit above the schedule grid so they aren't clipped or covered. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-between px-5 transition-opacity duration-100",
            )}
          >
            <span
              className={cn(
                "rounded-md border-2 border-emerald-500 bg-white/95 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-600 shadow-sm transition-opacity duration-100",
                progress > 0.12 ? "opacity-100" : "opacity-0",
              )}
              style={{
                transform: `rotate(-14deg) scale(${0.95 + Math.min(progress, 1) * 0.08})`,
              }}
            >
              Prev
            </span>
            <span
              className={cn(
                "rounded-md border-2 border-sky-500 bg-white/95 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-sky-600 shadow-sm transition-opacity duration-100",
                progress < -0.12 ? "opacity-100" : "opacity-0",
              )}
              style={{
                transform: `rotate(14deg) scale(${0.95 + Math.min(Math.abs(progress), 1) * 0.08})`,
              }}
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
