import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Trainer sign in",
  description:
    "Sign in to PT Bookings — free personal trainer scheduling software for the UK. Magic-link email sign-in, no password required.",
  path: "/login",
  keywords: [
    "personal trainer login UK",
    "PT Bookings sign in",
    "personal trainer software UK",
  ],
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
