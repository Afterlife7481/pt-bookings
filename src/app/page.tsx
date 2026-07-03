import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { LandingPage } from "@/components/LandingPage";
import { buildPageMetadata, homePageJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Personal Trainer Scheduling Software UK — Free to Start",
  description:
    "PT Bookings is free scheduling software for UK personal trainers. Manage recurring clients, send client portal links, fill last-minute slots, and track session payments.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={homePageJsonLd()} />
      <LandingPage />
    </>
  );
}
