import Link from "next/link";
import { cn } from "@/lib/utils";

export function ClientPageLayout({
  title,
  description,
  backHref,
  backLabel = "Your sessions",
  children,
}: {
  title: string;
  description?: string;
  backHref: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <Link
        href={backHref}
        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
      >
        ← {backLabel}
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </header>
      {children}
    </div>
  );
}

export function ClientGroup({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">{children}</div>
      </div>
      {footer ? (
        <p className="px-1 text-xs leading-relaxed text-slate-500">{footer}</p>
      ) : null}
    </div>
  );
}

export function ClientRowLink({
  href,
  title,
  subtitle,
  detail,
}: {
  href: string;
  title: string;
  subtitle?: string;
  detail?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[3rem] items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-slate-50 active:bg-slate-100"
    >
      <div className="min-w-0 flex-1">
        <span className="font-medium text-slate-900">{title}</span>
        {subtitle ? (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      <span className="flex shrink-0 items-center gap-2 self-center text-slate-400">
        {detail ? (
          <span className="max-w-[10rem] truncate text-slate-500">{detail}</span>
        ) : null}
        <span aria-hidden className="text-base leading-none">
          ›
        </span>
      </span>
    </Link>
  );
}

export function ClientInset({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
