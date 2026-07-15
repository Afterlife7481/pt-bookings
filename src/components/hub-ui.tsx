import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Shared list/hub primitives used by trainer settings and the client portal.
 * Domain wrappers in client-ui / settings-ui keep call sites readable.
 */
export function HubPageLayout({
  title,
  description,
  backHref,
  backLabel = "Back",
  showBackLink = true,
  className,
  children,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  showBackLink?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto max-w-2xl space-y-5", className)}>
      {showBackLink && backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← {backLabel}
        </Link>
      ) : null}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}

export function HubGroup({
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

export function HubRowLink({
  href,
  title,
  subtitle,
  detail,
  external,
}: {
  href: string;
  title: string;
  subtitle?: string;
  detail?: string;
  external?: boolean;
}) {
  const className =
    "flex min-h-[3rem] items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-slate-50 active:bg-slate-100";

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <span className="font-medium text-slate-900">{title}</span>
        {subtitle ? (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {subtitle}
          </p>
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
    </>
  );

  if (external) {
    return (
      <a href={href} className={className} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export function HubRowButton({
  title,
  subtitle,
  onClick,
  tone = "default",
}: {
  title: string;
  subtitle?: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[3rem] items-center justify-between gap-3 px-4 py-3 text-left text-sm transition hover:bg-slate-50 active:bg-slate-100"
    >
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "font-medium",
            tone === "danger" ? "text-red-600" : "text-slate-900",
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {subtitle}
          </p>
        ) : null}
      </div>
    </button>
  );
}

export function HubInset({
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
