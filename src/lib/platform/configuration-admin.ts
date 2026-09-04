import { NextResponse } from "next/server";
import { getAuthenticatedUser, getSupabaseAdminClient } from "@/lib/api/supabase-route";

export const platformConfigurationAdminDeps = {
  getAuthenticatedUser,
  getSupabaseAdminClient,
};

const CONFIGURATION_ADMIN_ROLES = new Set(["admin", "super_admin"]);

export async function requirePlatformConfigurationAdmin(req: Request) {
  const user = await platformConfigurationAdminDeps.getAuthenticatedUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const supabaseAdmin = platformConfigurationAdminDeps.getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const role = Array.isArray(data)
    ? data.map((row) => String(row?.role ?? "")).find((candidate) => CONFIGURATION_ADMIN_ROLES.has(candidate)) ?? null
    : null;
  if (!role) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }

  return {
    supabaseAdmin,
    userId: user.id,
    userEmail: user.email ?? null,
    role,
  } as const;
}

export async function writePlatformConfigurationAudit(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  actor: { userId: string; userEmail: string | null; role: string },
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {},
) {
  const { error } = await supabaseAdmin.from("platform_audit_logs").insert({
    actor_id: actor.userId,
    actor_email: actor.userEmail,
    actor_role: actor.role,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
  if (error) throw error;
}
