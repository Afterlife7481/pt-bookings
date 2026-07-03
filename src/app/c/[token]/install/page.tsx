import { ensureDb } from "@/lib/db/init";
import { getClientByToken } from "@/lib/services/clients";
import { InstallAppSection } from "@/app/dashboard/components/InstallAppSection";
import { ClientInset, ClientPageLayout } from "@/components/client/client-ui";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientInstallPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await ensureDb();
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) notFound();

  return (
    <main className="p-4 sm:p-6">
      <ClientPageLayout
        title="Install on your phone"
        description="Add PT Bookings to your home screen for quick access to your sessions — like a native app, without the App Store."
        backHref={`/c/${token}`}
      >
        <ClientInset>
          <InstallAppSection embedded variant="client" />
        </ClientInset>
      </ClientPageLayout>
    </main>
  );
}
