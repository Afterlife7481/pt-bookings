"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils";

const EXIT_MS = 420;
const DISMISS_DISTANCE_PX = 96;
const DISMISS_VELOCITY = 0.55;
const DRAG_START_PX = 8;
/** iOS-like sheet rise: fast start, soft settle. */
const SHEET_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

type BodyScrollSnapshot = {
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  htmlOverflow: string;
  htmlOverscroll: string;
  scrollY: number;
};

let bodyScrollLockCount = 0;
let bodyScrollSnapshot: BodyScrollSnapshot | null = null;

function acquireBodyScrollLock() {
  if (typeof document === "undefined") return;

  if (bodyScrollLockCount === 0) {
    const scrollY = window.scrollY;
    const html = document.documentElement;
    const { style: bodyStyle } = document.body;
    const { style: htmlStyle } = html;

    bodyScrollSnapshot = {
      bodyOverflow: bodyStyle.overflow,
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyLeft: bodyStyle.left,
      bodyRight: bodyStyle.right,
      bodyWidth: bodyStyle.width,
      htmlOverflow: htmlStyle.overflow,
      htmlOverscroll: htmlStyle.overscrollBehavior,
      scrollY,
    };

    // Avoid position:fixed when the page isn't scrolled — it causes a visible jump
    // behind the sheet on mobile.
    htmlStyle.overflow = "hidden";
    htmlStyle.overscrollBehavior = "none";
    bodyStyle.overflow = "hidden";
    if (scrollY > 0) {
      bodyStyle.position = "fixed";
      bodyStyle.top = `-${scrollY}px`;
      bodyStyle.left = "0";
      bodyStyle.right = "0";
      bodyStyle.width = "100%";
    }
  }

  bodyScrollLockCount += 1;
}

function releaseBodyScrollLock() {
  if (typeof document === "undefined") return;
  if (bodyScrollLockCount === 0) return;

  bodyScrollLockCount -= 1;
  if (bodyScrollLockCount > 0 || !bodyScrollSnapshot) return;

  const snapshot = bodyScrollSnapshot;
  bodyScrollSnapshot = null;

  const html = document.documentElement;
  const { style: bodyStyle } = document.body;
  const { style: htmlStyle } = html;

  bodyStyle.overflow = snapshot.bodyOverflow;
  bodyStyle.position = snapshot.bodyPosition;
  bodyStyle.top = snapshot.bodyTop;
  bodyStyle.left = snapshot.bodyLeft;
  bodyStyle.right = snapshot.bodyRight;
  bodyStyle.width = snapshot.bodyWidth;
  htmlStyle.overflow = snapshot.htmlOverflow;
  htmlStyle.overscrollBehavior = snapshot.htmlOverscroll;
  if (snapshot.scrollY > 0) window.scrollTo(0, snapshot.scrollY);
}

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    acquireBodyScrollLock();
    return () => releaseBodyScrollLock();
  }, [active]);
}

function useIsMobileSheet() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function SheetModal({
  title,
  titleHref,
  subtitle,
  onClose,
  children,
  footer,
  className,
  size = "default",
}: {
  title: string;
  titleHref?: string;
  subtitle?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** default: narrow form sheet; wide: week schedule / denser content */
  size?: "default" | "wide";
}) {
  useBodyScrollLock(true);
  const isMobile = useIsMobileSheet();
  const [mounted, setMounted] = useState(false);

  const [entered, setEntered] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const closingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const tracking = useRef(false);
  const dragActive = useRef(false);
  const dragFromHandle = useRef(false);
  const originY = useRef(0);
  const lastSample = useRef({ y: 0, t: 0 });
  const velocityY = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Ensure the off-screen frame paints before we animate in.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  const requestClose = useCallback((options?: { fromDrag?: boolean }) => {
    if (closingRef.current) return;
    closingRef.current = true;
    tracking.current = false;
    dragActive.current = false;
    activePointerId.current = null;
    setDragging(false);

    if (options?.fromDrag) {
      setDragY(typeof window !== "undefined" ? window.innerHeight : 800);
    } else {
      setDragY(0);
      setEntered(false);
    }

    window.setTimeout(() => onClose(), EXIT_MS);
  }, [onClose]);

  function canStartContentDrag() {
    const scroller = scrollRef.current;
    return !scroller || scroller.scrollTop <= 0;
  }

  function resetDrag() {
    tracking.current = false;
    dragActive.current = false;
    activePointerId.current = null;
    setDragging(false);
    setDragY(0);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>, fromHandle: boolean) {
    if (!isMobile || closingRef.current) return;
    if (event.pointerType === "mouse") return;
    if (!fromHandle && !canStartContentDrag()) return;

    tracking.current = true;
    dragActive.current = false;
    dragFromHandle.current = fromHandle;
    activePointerId.current = event.pointerId;
    originY.current = event.clientY;
    lastSample.current = { y: event.clientY, t: event.timeStamp };
    velocityY.current = 0;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!tracking.current || activePointerId.current !== event.pointerId) return;

    const delta = event.clientY - originY.current;

    if (!dragActive.current) {
      if (Math.abs(delta) < DRAG_START_PX) return;
      // Content scroll / upward swipe: don't steal the gesture.
      if (!dragFromHandle.current && delta < 0) {
        resetDrag();
        return;
      }
      if (!dragFromHandle.current && !canStartContentDrag()) {
        resetDrag();
        return;
      }
      dragActive.current = true;
      setDragging(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture can fail if the element is gone; safe to ignore.
      }
    }

    const nextY = Math.max(0, delta);
    const dt = event.timeStamp - lastSample.current.t;
    if (dt > 0) {
      velocityY.current = (event.clientY - lastSample.current.y) / dt;
    }
    lastSample.current = { y: event.clientY, t: event.timeStamp };
    setDragY(nextY);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (!tracking.current || activePointerId.current !== event.pointerId) return;

    const wasDragging = dragActive.current;
    const distance = Math.max(0, event.clientY - originY.current);
    const shouldDismiss =
      wasDragging &&
      (distance >= DISMISS_DISTANCE_PX || velocityY.current >= DISMISS_VELOCITY);

    tracking.current = false;
    dragActive.current = false;
    activePointerId.current = null;
    setDragging(false);

    if (shouldDismiss) {
      requestClose({ fromDrag: true });
      return;
    }

    // Keep the inline transform for one frame so the sheet can ease back up.
    requestAnimationFrame(() => setDragY(0));
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLElement>) {
    if (activePointerId.current !== event.pointerId) return;
    resetDrag();
  }

  const backdropOpacity = entered
    ? Math.max(0.12, 1 - dragY / 320)
    : 0;

  const sheetTransform =
    dragY > 0 || dragging
      ? `translate3d(0, ${dragY}px, 0)`
      : entered
        ? "translate3d(0, 0, 0)"
        : isMobile
          ? "translate3d(0, 110%, 0)"
          : "translate3d(0, 12px, 0)";

  if (!mounted) return null;

  const sheetStyle: CSSProperties = {
    transitionTimingFunction: SHEET_EASE,
    transform: sheetTransform,
    opacity: isMobile || entered ? 1 : 0,
    willChange: "transform",
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-hidden p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className={cn(
          "absolute inset-0 bg-black/40 ease-out motion-reduce:transition-none",
          dragging ? "duration-0" : "duration-[420ms]",
        )}
        style={{
          opacity: backdropOpacity,
          transitionTimingFunction: SHEET_EASE,
        }}
        onClick={() => requestClose()}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden bg-white shadow-lg",
          "rounded-t-2xl sm:rounded-xl",
          size === "wide" ? "sm:max-w-3xl" : "sm:max-w-sm",
          "motion-reduce:transition-none",
          !dragging && "transition-[transform,opacity] duration-[420ms]",
          className,
        )}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          className="shrink-0 touch-none px-5 pb-1 pt-3 sm:hidden"
          onPointerDown={(e) => onPointerDown(e, true)}
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
          <span className="sr-only">Drag down to close</span>
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={() => requestClose()}
          className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 sm:right-4 sm:top-4"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div
          ref={scrollRef}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-1 sm:px-6 sm:pb-6 sm:pt-6",
            dragging && dragY > 0 && "overflow-hidden touch-none",
          )}
          onPointerDown={(e) => onPointerDown(e, false)}
        >
          <div className="pr-10">
            <h3 className="font-semibold text-slate-900">
              {titleHref ? (
                <Link href={titleHref} className="text-blue-600 hover:underline">
                  {title}
                </Link>
              ) : (
                title
              )}
            </h3>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            )}
          </div>
          {children}
          {footer && (
            <div className="mt-6 flex flex-col gap-2">{footer}</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
