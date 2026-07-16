import Link from "next/link";

export function ClientPageHeader({
  clientName,
  backHref = "/dashboard/clients",
  backLabel = "Clients",
  title,
}: {
  clientName?: string;
  backHref?: string;
  backLabel?: string;
  /** When set, shows as the page title (subpages). Otherwise uses clientName. */
  title?: string;
}) {
  return (
    <div>
      <Link
        href={backHref}
        className="text-sm text-slate-500 hover:text-slate-900"
      >
        ← Back to {backLabel}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{title ?? clientName}</h1>
      {title && clientName ? (
        <p className="mt-1 text-sm text-slate-500">{clientName}</p>
      ) : null}
    </div>
  );
}
