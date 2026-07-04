"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutTrainer } from "../hooks/useTrainerSettings";
import { MENU_ITEMS, type TrainerSettings } from "../types";

const MAIN_MENU_HREFS = new Set([
  "/dashboard/schedule",
  "/dashboard/clients",
  "/dashboard/sessions",
  "/dashboard/whatsapp",
]);

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard/clients") {
    return pathname === href || pathname.startsWith("/dashboard/clients/");
  }
  if (href === "/dashboard/settings") {
    return (
      pathname === href ||
      (pathname.startsWith("/dashboard/settings/") &&
        pathname !== "/dashboard/settings/account" &&
        pathname !== "/dashboard/settings/install" &&
        !pathname.startsWith("/dashboard/settings/getting-started"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function DashboardHeader({ settings }: { settings: TrainerSettings | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const mainItems = MENU_ITEMS.filter((item) => MAIN_MENU_HREFS.has(item.href));
  const accountItems = MENU_ITEMS.filter((item) => !MAIN_MENU_HREFS.has(item.href));

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
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="dashboard-menu"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="dashboard-menu"
            aria-label="Dashboard"
            className="absolute right-0 top-0 flex h-full w-[min(100%,18rem)] flex-col bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">Menu</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close menu"
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
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto p-2">
              <ul>
                {mainItems.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                          active
                            ? "bg-slate-900 text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <ul className="mt-2 border-t border-slate-200 pt-2">
                {accountItems.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                          active
                            ? "bg-slate-900 text-white"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                        {item.href === "/dashboard/settings/account" && settings?.email ? (
                          <span
                            className={`mt-0.5 block truncate text-xs font-normal ${
                              active ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {settings.email}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-auto border-t border-slate-200 pt-2">
                <button
                  type="button"
                  onClick={() => logoutTrainer()}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Log out
                </button>
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
