import type { Metadata } from "next";
import { SITE_LANGUAGE, SITE_NAME, DEFAULT_DESCRIPTION, getSiteUrl } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — Personal Trainer Scheduling Software UK`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "Business",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={SITE_LANGUAGE}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
