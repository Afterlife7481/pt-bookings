import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Keeps page back navigation visible under the dashboard sticky chrome
 * (`--dashboard-chrome-height`, set by DashboardShell).
 */
export function StickyBackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className="sticky z-30 -mx-4 border-b border-slate-200/70 bg-slate-50/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6"
      style={{ top: "var(--dashboard-chrome-height, 0px)" }}
    >
      <Link
        href={href}
        className={cn(
          "inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline",
          className,
        )}
      >
        {children}
      </Link>
    </div>
  );
}
