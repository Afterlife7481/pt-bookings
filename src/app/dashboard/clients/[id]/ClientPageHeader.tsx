import { StickyBackLink } from "@/components/StickyBackLink";

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
    <div className="space-y-2">
      <StickyBackLink
        href={backHref}
        className="font-normal text-slate-500 hover:text-slate-900 hover:no-underline"
      >
        ← Back to {backLabel}
      </StickyBackLink>
      <div>
        <h1 className="text-2xl font-bold">{title ?? clientName}</h1>
        {title && clientName ? (
          <p className="mt-1 text-sm text-slate-500">{clientName}</p>
        ) : null}
      </div>
    </div>
  );
}
