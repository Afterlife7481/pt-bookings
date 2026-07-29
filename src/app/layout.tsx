import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { Figtree, Syne } from "next/font/google";
import { SerwistProvider } from "@serwist/next/react";
import {
  SITE_LANGUAGE,
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  getSiteUrl,
} from "@/lib/seo";
import { brand, brandCssVars } from "@/lib/brand";
import "./globals.css";

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const body = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — Personal Trainer Scheduling Software UK`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "Business",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: brand.green,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={SITE_LANGUAGE} style={brandCssVars as CSSProperties}>
      <body
        className={`${display.variable} ${body.variable} min-h-screen antialiased`}
      >
        <SerwistProvider swUrl="/sw.js">{children}</SerwistProvider>
      </body>
    </html>
  );
}
