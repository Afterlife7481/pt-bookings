import type { MetadataRoute } from "next";
import { getSiteUrl, PUBLIC_ROUTES } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
