"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    const previous = {
      overflow: style.overflow,
      position: style.position,
      top: style.top,
      width: style.width,
    };

    style.overflow = "hidden";
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";

    return () => {
      style.overflow = previous.overflow;
      style.position = previous.position;
      style.top = previous.top;
      style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

export function SheetModal({
  title,
  titleHref,
  subtitle,
  onClose,
  children,
  footer,
  className,
}: {
  title: string;
  titleHref?: string;
  subtitle?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useBodyScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-50 flex touch-none items-end justify-center overflow-hidden bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "max-h-[90vh] w-full touch-auto overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-5 shadow-lg sm:max-w-sm sm:rounded-xl sm:p-6",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="relative pr-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
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
  );
}
