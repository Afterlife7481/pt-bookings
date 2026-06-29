import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SheetModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-lg sm:max-w-sm sm:rounded-xl sm:p-6",
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
          <h3 className="font-semibold text-slate-900">{title}</h3>
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
