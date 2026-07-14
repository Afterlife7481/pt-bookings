import { cn } from "@/lib/utils";

const linkClassName =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50";

export function AddToCalendarLinks({
  icsHref,
  googleCalendarUrl,
  className,
}: {
  icsHref: string;
  googleCalendarUrl: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <a href={icsHref} className={linkClassName} download>
        Add to calendar
      </a>
      <a
        href={googleCalendarUrl}
        className={linkClassName}
        target="_blank"
        rel="noopener noreferrer"
      >
        Google Calendar
      </a>
    </div>
  );
}
