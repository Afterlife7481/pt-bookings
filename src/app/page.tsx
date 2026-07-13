import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { HomeLanding } from "@/components/home/HomeLanding";
import { buildPageMetadata, homePageJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Personal Trainer Scheduling Software UK — Free to Start",
  description:
    "Scheduling for UK personal trainers at one or many locations. Manage recurring and drop-in clients, open slots, last-minute alerts, and flexible booking rules — free to start.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={homePageJsonLd()} />
      <HomeLanding />
    </>
  );
}
