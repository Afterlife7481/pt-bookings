import type { Metadata } from "next";
import { TRAINER_MANIFEST_PATH } from "@/lib/pwa-manifest";
import { DashboardShell } from "./components/DashboardShell";

export const metadata: Metadata = {
  manifest: TRAINER_MANIFEST_PATH,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
