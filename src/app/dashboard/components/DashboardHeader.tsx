"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { logoutTrainer } from "../hooks/useTrainerSettings";
import { NAV_ITEMS, type TrainerSettings } from "../types";

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard/clients") {
    return pathname === href || pathname.startsWith("/dashboard/clients/");
  }
  if (href === "/dashboard/settings") {
    return pathname === href || pathname.startsWith("/dashboard/settings/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardHeader({ settings }: { settings: TrainerSettings | null }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <Link href="/dashboard/schedule" className="hover:opacity-90">
            <h1 className="text-lg font-bold sm:text-xl">PT Bookings</h1>
          </Link>
          <p className="truncate text-sm text-slate-500">
            {settings?.name ? `${settings.name} · Trainer dashboard` : "Trainer dashboard"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/info">
            <Button variant="secondary" className="px-2 text-xs sm:px-4 sm:text-sm">
              How it works
            </Button>
          </Link>
          <Button
            variant="secondary"
            className="px-2 text-xs sm:px-4 sm:text-sm"
            onClick={() => router.push("/dashboard/settings")}
          >
            Settings
          </Button>
          <Button
            variant="secondary"
            className="px-2 text-xs sm:px-4 sm:text-sm"
            onClick={() => logoutTrainer()}
          >
            Log out
          </Button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
