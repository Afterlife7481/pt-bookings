import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/seo";

export const TRAINER_MANIFEST_PATH = "/manifest.webmanifest";

const PWA_ICONS: MetadataRoute.Manifest["icons"] = [
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
];

const PWA_BASE = {
  display: "standalone" as const,
  orientation: "portrait-primary" as const,
  background_color: "#020617",
  theme_color: "#020617",
  lang: "en-GB",
  dir: "ltr" as const,
  categories: ["business", "productivity"],
  icons: PWA_ICONS,
};

/** Trainer dashboard PWA — opens schedule after login. */
export function buildTrainerPwaManifest(): MetadataRoute.Manifest {
  return {
    ...PWA_BASE,
    name: SITE_NAME,
    short_name: SITE_NAME,
    description:
      "Personal trainer scheduling — weekly diary, client portal links, and session management.",
    start_url: "/dashboard/schedule",
    scope: "/dashboard/",
    id: "/dashboard/",
  };
}

/** Client portal PWA — opens that client's home link with no login. */
export function buildClientPwaManifest(
  token: string,
  clientName: string,
): MetadataRoute.Manifest {
  const portalPath = `/c/${token}`;
  const shortName =
    clientName.length > 12 ? "My sessions" : `${clientName} sessions`;

  return {
    ...PWA_BASE,
    name: `${SITE_NAME} — ${clientName}`,
    short_name: shortName,
    description: "View and manage your personal training sessions.",
    start_url: portalPath,
    scope: "/",
    id: portalPath,
  };
}

export function clientManifestPath(token: string): string {
  return `/c/${token}/manifest.webmanifest`;
}
