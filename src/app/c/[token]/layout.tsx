import type { Metadata } from "next";
import { clientManifestPath } from "@/lib/pwa-manifest";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  return {
    manifest: clientManifestPath(token),
    appleWebApp: {
      capable: true,
      title: "My sessions",
      statusBarStyle: "black-translucent",
    },
  };
}

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
