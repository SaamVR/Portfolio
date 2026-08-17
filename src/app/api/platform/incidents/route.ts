import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";
import { getProductionEnvironmentIssues } from "@/lib/platform/env-health";
import { logPlatformAuditAction } from "@/lib/platform/audit-logger";

export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

async function requireFullPlatformAdmin(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return { error: noStoreJson({ error: "Unauthorized" }, { status: 401 }) } as const;

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (error) throw error;

  const roles = Array.isArray(data) ? data.map((row) => row?.role).filter(Boolean) : [];
  const role = roles.includes("super_admin") ? "super_admin" : roles.includes("admin") ? "admin" : null;
  if (!role) return { error: noStoreJson({ error: "Forbidden" }, { status: 403 }) } as const;

  return { user, role, supabaseAdmin } as const;
}

export async function GET(req: Request) {
  try {
    const auth = await requireFullPlatformAdmin(req);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const includeResolved = searchParams.get("includeResolved") === "1";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));

    let query = auth.supabaseAdmin
      .from("platform_incidents")
      .select("id, fingerprint, severity, source, title, message, route, store_id, request_id, metadata, status, occurrence_count, first_seen_at, last_seen_at, resolved_at, resolved_by")
      .order("last_seen_at", { ascending: false })
      .limit(limit);

    if (!includeResolved) query = query.eq("status", "open");

    const { data, error } = await query;
    if (error) throw error;

    return noStoreJson({
      generatedAt: new Date().toISOString(),
      environmentIssues: getProductionEnvironmentIssues(),
      incidents: Array.isArray(data) ? data : [],
    });
  } catch (error) {
    console.error("Platform incident center read error:", error);
    return noStoreJson({ error: "Failed to load platform incidents" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireFullPlatformAdmin(req);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => null);
    const incidentId = typeof body?.incidentId === "string" ? body.incidentId.trim() : "";
    const action = body?.action === "resolve" ? "resolve" : body?.action === "reopen" ? "reopen" : null;
    if (!incidentId || !action) {
      return noStoreJson({ error: "Missing incidentId or action" }, { status: 400 });
    }

    const update = action === "resolve"
      ? {
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: auth.user.id,
          updated_at: new Date().toISOString(),
        }
      : {
          status: "open",
          resolved_at: null,
          resolved_by: null,
          updated_at: new Date().toISOString(),
        };

    const { data: incident, error } = await auth.supabaseAdmin
      .from("platform_incidents")
      .update(update)
      .eq("id", incidentId)
      .select("id, title, source, status")
      .maybeSingle();
    if (error) throw error;
    if (!incident) return noStoreJson({ error: "Incident not found" }, { status: 404 });

    await logPlatformAuditAction(auth.supabaseAdmin, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      actorRole: auth.role,
      action: action === "resolve" ? "resolve_platform_incident" : "reopen_platform_incident",
      targetType: "platform_incident",
      targetId: incidentId,
      details: {
        title: incident.title,
        source: incident.source,
        status: incident.status,
      },
    });

    return noStoreJson({ success: true, incident });
  } catch (error) {
    console.error("Platform incident center mutation error:", error);
    return noStoreJson({ error: "Failed to update platform incident" }, { status: 500 });
  }
}
