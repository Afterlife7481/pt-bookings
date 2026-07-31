import { ensureDb } from "@/lib/db/init";
import { getClientByToken } from "@/lib/services/clients";
import { buildClientPwaManifest } from "@/lib/pwa-manifest";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  await ensureDb();
  const { token } = await params;
  const client = await getClientByToken(token);
  if (!client) {
    return new Response("Not found", { status: 404 });
  }

  const manifest = buildClientPwaManifest(token);

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "private, no-cache",
    },
  });
}
