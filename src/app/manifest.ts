import type { MetadataRoute } from "next";
import { buildTrainerPwaManifest } from "@/lib/pwa-manifest";

/** Trainer dashboard PWA. Client portals use /c/[token]/manifest.webmanifest instead. */
export default function manifest(): MetadataRoute.Manifest {
  return buildTrainerPwaManifest();
}
