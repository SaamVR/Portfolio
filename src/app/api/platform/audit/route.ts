import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { logPlatformAuditAction, sanitizeAuditDetails } from "@/lib/platform/audit-logger";

const PLATFORM_AUDIT_ROLE_PRIORITY = ["admin", "super_admin", "billing_admin", "support_agent"] as const;

type PlatformAuditRole = (typeof PLATFORM_AUDIT_ROLE_PRIORITY)[number];

type ClientAuditContract = {
  targetType: string;
  requireTargetId: boolean;
};

const CLIENT_AUDIT_CONTRACTS: Record<string, ClientAuditContract> = {
  exit_impersonate_merchant: { targetType: "store", requireTargetId: true },
};

export type ClientAuditPayload = {
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
};

export function resolvePlatformAuditRole(rows: Array<{ role?: unknown }> | null | undefined): PlatformAuditRole | null {
  if (!Array.isArray(rows)) return null;
  return PLATFORM_AUDIT_ROLE_PRIORITY.find((candidate) =>
    rows.some((row) => typeof row?.role === "string" && row.role === candidate),
  ) ?? null;
}

export function parseClientAuditPayload(body: unknown): ClientAuditPayload | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const action = typeof record.action === "string" ? record.action.trim() : "";
  const targetType = typeof record.targetType === "string" ? record.targetType.trim() : "";
  const targetId = typeof record.targetId === "string" && record.targetId.trim()
    ? record.targetId.trim().slice(0, 200)
    : null;
  const contract = CLIENT_AUDIT_CONTRACTS[action];

  if (!contract || targetType !== contract.targetType || (contract.requireTargetId && !targetId)) {
    return null;
  }

  const details = record.details && typeof record.details === "object" && !Array.isArray(record.details)
    ? sanitizeAuditDetails(record.details as Record<string, unknown>)
    : {};

  return { action, targetType, targetId, details };
}

export function getTrustedAuditIp(req: Request) {
  const forwarded = req.headers.get("x-vercel-forwarded-for");
  if (!forwarded) return null;
  const first = forwarded.split(",")[0]?.trim();
  return first ? first.slice(0, 64) : null;
}

export const platformAuditRouteDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
  logPlatformAuditAction,
};

export async function POST(req: Request) {
  try {
    const user = await platformAuditRouteDeps.getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = parseClientAuditPayload(await req.json());
    if (!payload) {
      return NextResponse.json({ error: "Unsupported audit event" }, { status: 400 });
    }

    const supabaseAdmin = platformAuditRouteDeps.getSupabaseAdminClient();
    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (roleError) throw roleError;

    const platformRole = resolvePlatformAuditRole(roleRows as Array<{ role?: unknown }> | null | undefined);
    if (!platformRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await platformAuditRouteDeps.logPlatformAuditAction(supabaseAdmin, {
      actorId: user.id,
      actorEmail: user.email,
      actorRole: platformRole,
      action: payload.action,
      targetType: payload.targetType,
      targetId: payload.targetId,
      details: payload.details,
      ipAddress: getTrustedAuditIp(req),
      mode: "required",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Platform audit route error:", error);
    return NextResponse.json({ error: "Failed to record platform audit event" }, { status: 500 });
  }
}
