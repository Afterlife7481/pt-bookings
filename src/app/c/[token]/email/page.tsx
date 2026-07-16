import { ensureDb } from "@/lib/db/init";
import { getClientByToken } from "@/lib/services/clients";
import { notFound } from "next/navigation";
import { ClientEmailPageClient } from "./ClientEmailPageClient";

export const dynamic = "force-dynamic";

export default async function ClientEmailPage({
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
      <ClientEmailPageClient
        clientToken={token}
        initialEmail={client.email ?? ""}
      />
    </main>
  );
}
