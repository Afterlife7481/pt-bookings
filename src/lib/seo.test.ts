import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_DESCRIPTION,
  SITE_COUNTRY,
  SITE_CURRENCY,
  SITE_LANGUAGE,
  buildPageMetadata,
  homePageJsonLd,
} from "@/lib/seo";

describe("seo", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("targets UK locale and market", () => {
    expect(SITE_LANGUAGE).toBe("en-GB");
    expect(SITE_COUNTRY).toBe("United Kingdom");
    expect(SITE_CURRENCY).toBe("GBP");
  });

  it("builds canonical metadata for public pages", () => {
    process.env.APP_BASE_URL = "https://ptbookings.co.uk";
    const metadata = buildPageMetadata({
      title: "Test page",
      description: "Test description",
      path: "/login",
    });

    expect(metadata.alternates?.canonical).toBe("https://ptbookings.co.uk/login");
    expect(metadata.openGraph?.locale).toBe("en_GB");
    expect(metadata.openGraph?.countryName).toBe("United Kingdom");
  });

  it("includes UK SoftwareApplication structured data", () => {
    process.env.APP_BASE_URL = "https://ptbookings.co.uk";
    const jsonLd = homePageJsonLd();
    const graph = jsonLd["@graph"] as Record<string, unknown>[];

    const app = graph.find((node) => node["@type"] === "SoftwareApplication");
    expect(app).toBeDefined();
    expect((app?.offers as { priceCurrency: string }).priceCurrency).toBe("GBP");
    expect((app?.areaServed as { name: string }).name).toBe("United Kingdom");
    expect(DEFAULT_DESCRIPTION).toMatch(/UK/);
  });
});
