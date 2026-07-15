import { ensureDb } from "@/lib/db/init";
import { getClientByToken } from "@/lib/services/clients";
import {
  requestClientEmailVerification,
  setClientLastMinutePruneNotify,
  verifyClientEmailCode,
} from "@/lib/services/client-email";
import { getRequestIp } from "@/lib/http/request";
import { enforceRateLimit } from "@/lib/rate-limit";

function checkRateLimit(request: Request, scope: string, limit: number) {
  const ip = getRequestIp(request);
  return enforceRateLimit(ip, {
    scope,
    limit,
    windowMs: 60 * 60 * 1000,
  });
}

async function requireClientFromBody(body: { token?: unknown }) {
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return { error: Response.json({ error: "Token required" }, { status: 400 }) };
  }
  const client = await getClientByToken(token);
  if (!client) {
    return {
      error: Response.json({ error: "Client not found" }, { status: 404 }),
    };
  }
  return { client };
}

export async function POST(request: Request) {
  await ensureDb();

  const body = await request.json();
  const action = body.action;

  if (action === "request_code") {
    const limited = checkRateLimit(request, "client-email:request", 10);
    if (limited) return limited;

    const result = await requireClientFromBody(body);
    if ("error" in result && result.error) return result.error;
    const client = result.client!;

    try {
      const sent = await requestClientEmailVerification({
        clientId: client.id,
        email: typeof body.email === "string" ? body.email : "",
      });
      return Response.json({
        ok: true,
        message: sent.delivered
          ? "Check your email for a verification code."
          : "Verification code created. Check email delivery in development logs.",
        ...(sent.devCode ? { devCode: sent.devCode } : {}),
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to send verification code";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  if (action === "verify_code") {
    const limited = checkRateLimit(request, "client-email:verify", 20);
    if (limited) return limited;

    const result = await requireClientFromBody(body);
    if ("error" in result && result.error) return result.error;
    const client = result.client!;

    try {
      await verifyClientEmailCode({
        clientId: client.id,
        email: typeof body.email === "string" ? body.email : "",
        code: typeof body.code === "string" ? body.code : "",
      });
      const updated = await getClientByToken(client.token);
      return Response.json({
        ok: true,
        email: updated?.email ?? "",
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to verify email";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  if (action === "set_prune_notify") {
    const limited = checkRateLimit(request, "client-email:prune-notify", 30);
    if (limited) return limited;

    const result = await requireClientFromBody(body);
    if ("error" in result && result.error) return result.error;
    const client = result.client!;

    try {
      await setClientLastMinutePruneNotify(
        client.id,
        body.enabled === true,
      );
      return Response.json({ ok: true, pruneNotify: body.enabled === true });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to update notification preference";
      return Response.json({ error: message }, { status: 400 });
    }
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
