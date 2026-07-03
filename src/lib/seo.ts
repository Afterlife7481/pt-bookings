import type { Metadata } from "next";
import { appBaseUrl } from "@/lib/constants";

export const SITE_NAME = "PT Bookings";

/** UK launch — locale and market targeting for metadata and structured data. */
export const SITE_LOCALE = "en_GB" as const;
export const SITE_LANGUAGE = "en-GB" as const;
export const SITE_COUNTRY = "United Kingdom" as const;
export const SITE_COUNTRY_CODE = "GB" as const;
export const SITE_CURRENCY = "GBP" as const;

export const DEFAULT_KEYWORDS = [
  "personal trainer booking software UK",
  "PT scheduling app UK",
  "personal training session management",
  "personal trainer client portal",
  "personal trainer diary UK",
  "fitness trainer booking system",
  "recurring PT sessions",
  "last minute personal training slots",
  "free personal trainer software UK",
] as const;

export const DEFAULT_DESCRIPTION =
  "Free personal trainer scheduling software for the UK. Weekly templates, client portal links, recurring sessions, last-minute fill-ins, and payment tracking — built for UK PTs.";

export function getSiteUrl(): string {
  return appBaseUrl();
}

type PageSeoOptions = {
  title: string;
  description: string;
  path?: string;
  keywords?: readonly string[];
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path = "",
  keywords = DEFAULT_KEYWORDS,
  noIndex = false,
}: PageSeoOptions): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const url = path ? `${siteUrl}${canonicalPath}` : siteUrl;

  return {
    title,
    description,
    keywords: [...keywords],
    alternates: {
      canonical: url,
      languages: {
        [SITE_LANGUAGE]: url,
      },
    },
    openGraph: {
      type: "website",
      locale: SITE_LOCALE,
      url,
      siteName: SITE_NAME,
      title,
      description,
      countryName: SITE_COUNTRY,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    other: {
      "geo.region": SITE_COUNTRY_CODE,
      "geo.placename": SITE_COUNTRY,
    },
  };
}

export function homePageJsonLd() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        inLanguage: SITE_LANGUAGE,
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: SITE_NAME,
        url: siteUrl,
        areaServed: {
          "@type": "Country",
          name: SITE_COUNTRY,
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: DEFAULT_DESCRIPTION,
        inLanguage: SITE_LANGUAGE,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: SITE_CURRENCY,
          availability: "https://schema.org/InStock",
          areaServed: {
            "@type": "Country",
            name: SITE_COUNTRY,
          },
        },
        areaServed: {
          "@type": "Country",
          name: SITE_COUNTRY,
        },
        audience: {
          "@type": "Audience",
          audienceType: "Personal trainers in the United Kingdom",
          geographicArea: {
            "@type": "Country",
            name: SITE_COUNTRY,
          },
        },
      },
    ],
  };
}

export const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/info", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/login", changeFrequency: "monthly" as const, priority: 0.6 },
];
