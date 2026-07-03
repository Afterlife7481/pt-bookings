import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

/** App-wide PWA — trainers install to open the dashboard; clients add their portal link from /c/[token]/install (iOS saves the current page URL). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description:
      "Personal trainer scheduling — weekly diary, client portal links, and session management.",
    start_url: "/dashboard/schedule",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#020617",
    theme_color: "#020617",
    lang: "en-GB",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
