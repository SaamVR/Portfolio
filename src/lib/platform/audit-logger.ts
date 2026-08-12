import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditLogInput {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

export interface PlatformAuditLogRow {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}

function normalizeAuditActorRole(role?: string | null) {
  if (!role) return null;

  const normalizedInput = role.trim().toLowerCase();

  if (normalizedInput === "admin" || normalizedInput === "super_admin") {
    return "admin";
  }

  if (normalizedInput === "co_admin" || normalizedInput === "billing_admin" || normalizedInput === "support_agent") {
    return "co_admin";
  }

  return null;
}

export async function logPlatformAuditAction(
  client: SupabaseClient | any,
  input: AuditLogInput,
): Promise<void> {
  try {
    const normalizedActorRole = normalizeAuditActorRole(input.actorRole);
    const payload = {
      actor_id: input.actorId ?? null,
      actor_email: input.actorEmail ?? null,
      actor_role: normalizedActorRole,
      action: input.action,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      details: {
        ...(input.details ?? {}),
        ...(input.actorRole && input.actorRole !== normalizedActorRole
          ? { actor_role_source: input.actorRole }
          : {}),
      },
      ip_address: input.ipAddress ?? null,
      created_at: new Date().toISOString(),
    };

    const { error } = await client.from("platform_audit_logs").insert(payload);
    if (error) {
      console.warn("Failed to insert platform_audit_logs:", error.message);
    }
  } catch (err) {
    console.warn("Error in logPlatformAuditAction:", err);
  }
}
