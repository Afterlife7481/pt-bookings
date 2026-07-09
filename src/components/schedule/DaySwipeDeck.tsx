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
const EXIT_MS = 180;
const ENTER_MS = 220;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastT: number;
  axis: "undecided" | "horizontal" | "vertical";
};

type Phase = "idle" | "dragging" | "exiting" | "entering";

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
  const phaseRef = useRef<Phase>("idle");
  const suppressClickRef = useRef(false);
  const skipTransitionRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef<number[]>([]);
  const swipeGenRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [deckWidth, setDeckWidth] = useState(320);

  const setPhaseBoth = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearAnimationHandles = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    for (const id of rafRef.current) window.cancelAnimationFrame(id);
    timersRef.current = [];
    rafRef.current = [];
  }, []);

  const queueTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const queueRaf = useCallback((fn: () => void) => {
    const id = window.requestAnimationFrame(fn);
    rafRef.current.push(id);
    return id;
  }, []);

  const snapFlat = useCallback(() => {
    clearAnimationHandles();
    skipTransitionRef.current = true;
    setDragX(0);
    setPhaseBoth("idle");
    dragRef.current = null;
    queueRaf(() => {
      skipTransitionRef.current = false;
    });
  }, [clearAnimationHandles, queueRaf, setPhaseBoth]);

  useEffect(() => {
    const node = deckRef.current;
    if (!node) return;
    const update = () => setDeckWidth(node.offsetWidth || 320);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => clearAnimationHandles(), [clearAnimationHandles]);

  // Picker / week-button navigation: snap flat only when not mid-swipe animation.
  useEffect(() => {
    if (phaseRef.current === "exiting" || phaseRef.current === "entering") {
      return;
    }
    snapFlat();
  }, [weekStart, selectedDay, snapFlat]);

  const commitSwipe = useCallback(
    (delta: -1 | 1) => {
      if (phaseRef.current === "exiting" || phaseRef.current === "entering") {
        return;
      }

      clearAnimationHandles();
      const gen = ++swipeGenRef.current;
      suppressClickRef.current = true;
      dragRef.current = null;
      setPhaseBoth("exiting");

      // Finish the current card in the finger direction first.
      // next exits left; previous exits right.
      skipTransitionRef.current = false;
      const exitX = delta > 0 ? -(deckWidth + 48) : deckWidth + 48;
      setDragX(exitX);

      queueTimeout(() => {
        if (swipeGenRef.current !== gen) return;

        // Swap day only after exit, so rapid opposite swipes can't desync content.
        onShiftDay(delta);

        // Park the new card on the arrival edge with no transition, then ease in.
        skipTransitionRef.current = true;
        setPhaseBoth("entering");
        setDragX(delta > 0 ? deckWidth * 0.34 : -deckWidth * 0.34);

        queueRaf(() => {
          if (swipeGenRef.current !== gen) return;
          skipTransitionRef.current = false;
          setDragX(0);

          queueTimeout(() => {
            if (swipeGenRef.current !== gen) return;
            setPhaseBoth("idle");
            suppressClickRef.current = false;
          }, ENTER_MS);
        });
      }, EXIT_MS);
    },
    [
      clearAnimationHandles,
      deckWidth,
      onShiftDay,
      queueRaf,
      queueTimeout,
      setPhaseBoth,
    ],
  );

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== "idle") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp,
      axis: "undecided",
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (phaseRef.current !== "idle" && phaseRef.current !== "dragging") return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (drag.axis === "undecided") {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      drag.axis =
        Math.abs(dx) > Math.abs(dy) * 1.2 ? "horizontal" : "vertical";
      if (drag.axis === "vertical") {
        dragRef.current = null;
        setPhaseBoth("idle");
        setDragX(0);
        return;
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      setPhaseBoth("dragging");
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

    if (phaseRef.current === "exiting" || phaseRef.current === "entering") {
      return;
    }

    if (drag.axis !== "horizontal") {
      setPhaseBoth("idle");
      setDragX(0);
      suppressClickRef.current = false;
      return;
    }

    const dx = event.clientX - drag.startX;
    const elapsed = Math.max(event.timeStamp - drag.lastT, 8);
    const recentVelocity = (event.clientX - drag.lastX) / elapsed;
    const shouldSwipe =
      Math.abs(dx) >= SWIPE_THRESHOLD_PX ||
      Math.abs(recentVelocity) >= SWIPE_VELOCITY;

    if (!shouldSwipe) {
      setPhaseBoth("idle");
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

  const locked = phase === "exiting" || phase === "entering";
  const dragging = phase === "dragging";
  const progress = Math.max(
    -1,
    Math.min(1, dragX / Math.max(deckWidth * 0.5, 1)),
  );
  const rotate = progress * MAX_ROTATION_DEG;
  const peekDelta: -1 | 1 | null =
    Math.abs(progress) < 0.08 ? null : progress < 0 ? 1 : -1;
  const peekScale = 0.94 + Math.min(Math.abs(progress), 1) * 0.06;

  const cardStyle: CSSProperties = {
    transform: `translate3d(${dragX}px, ${Math.abs(progress) * 4}px, 0) rotate(${rotate}deg)`,
    transition:
      dragging || skipTransitionRef.current
        ? "none"
        : `transform ${phase === "exiting" ? EXIT_MS : ENTER_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
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
          locked && "pointer-events-none",
          dragging && "cursor-grabbing select-none",
          !dragging && !locked && "cursor-grab",
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
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-between px-5"
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
