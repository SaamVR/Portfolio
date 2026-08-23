import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TUNNEL_ID = "f961031f-a93d-427b-a8e1-047a1138c5f6";
const HOSTNAME = "codex-api.ezcomo.shop";
const SERVICE = "http://localhost:8765";

async function cf(path: string, init: RequestInit = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN missing");
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const msg = body?.errors?.map((e: any) => e?.message).filter(Boolean).join(", ") || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

export async function POST(req: Request) {
  if (req.headers.get("x-bootstrap-secret") !== process.env.CODEX_CF_BOOTSTRAP_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!zoneId || !accountId) {
    return NextResponse.json({ error: "cloudflare ids missing" }, { status: 500 });
  }

  const target = `${TUNNEL_ID}.cfargotunnel.com`;
  const result: Record<string, unknown> = { tunnelId: TUNNEL_ID, hostname: HOSTNAME, target };

  try {
    const config = await cf(`/accounts/${accountId}/cfd_tunnel/${TUNNEL_ID}/configurations`, {
      method: "PUT",
      body: JSON.stringify({
        config: {
          ingress: [
            { hostname: HOSTNAME, service: SERVICE },
            { service: "http_status:404" },
          ],
        },
      }),
    });
    result.tunnelConfig = config?.success !== false ? "ok" : "failed";
  } catch (error) {
    result.tunnelConfig = `skipped: ${error instanceof Error ? error.message : "unknown"}`;
  }

  const records = await cf(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(HOSTNAME)}`);
  const exact = Array.isArray(records?.result) ? records.result : [];
  const cname = exact.find((r: any) => r?.type === "CNAME");

  for (const record of exact) {
    if (["A", "AAAA"].includes(record?.type)) {
      await cf(`/zones/${zoneId}/dns_records/${record.id}`, { method: "DELETE" });
    }
  }

  const payload = JSON.stringify({ type: "CNAME", name: HOSTNAME, content: target, ttl: 1, proxied: true });
  if (cname) {
    await cf(`/zones/${zoneId}/dns_records/${cname.id}`, { method: "PUT", body: payload });
    result.dns = "updated";
  } else {
    await cf(`/zones/${zoneId}/dns_records`, { method: "POST", body: payload });
    result.dns = "created";
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
