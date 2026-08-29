import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditWriteMode = "best_effort" | "required";

export interface AuditLogInput {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  mode?: AuditWriteMode;
}

export interface PlatformAuditLogRow {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

const MAX_AUDIT_DEPTH = 4;
const MAX_AUDIT_KEYS = 40;
const MAX_AUDIT_ARRAY_ITEMS = 30;
const MAX_AUDIT_STRING_LENGTH = 500;
const REDACTED = "[redacted]";
const TRUNCATED = "[truncated]";

function normalizeSensitiveKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveAuditKey(key: string) {
  const normalized = normalizeSensitiveKey(key);
  return [
    "secret",
    "token",
    "password",
    "passwd",
    "authorization",
    "cookie",
    "credential",
    "apikey",
    "privatekey",
    "servicerole",
    "accesskey",
    "refreshtoken",
    "clientsecret",
  ].some((marker) => normalized.includes(marker));
}

function sanitizeAuditValue(value: unknown, depth: number): unknown {
  if (depth > MAX_AUDIT_DEPTH) return TRUNCATED;
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, MAX_AUDIT_STRING_LENGTH);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return null;

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_AUDIT_ARRAY_ITEMS)
      .map((item) => sanitizeAuditValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>).slice(0, MAX_AUDIT_KEYS)) {
      result[key.slice(0, 100)] = isSensitiveAuditKey(key)
        ? REDACTED
        : sanitizeAuditValue(nestedValue, depth + 1);
    }
    return result;
  }

  return null;
}

export function sanitizeAuditDetails(details?: Record<string, unknown>) {
  return (sanitizeAuditValue(details ?? {}, 0) ?? {}) as Record<string, unknown>;
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

export function buildAuditLogPayload(input: AuditLogInput, createdAt = new Date().toISOString()) {
  const normalizedActorRole = normalizeAuditActorRole(input.actorRole);
  return {
    actor_id: input.actorId ?? null,
    actor_email: typeof input.actorEmail === "string" ? input.actorEmail.slice(0, 320) : null,
    actor_role: normalizedActorRole,
    action: input.action.trim().slice(0, 120),
    target_type: input.targetType.trim().slice(0, 120),
    target_id: typeof input.targetId === "string" ? input.targetId.slice(0, 200) : null,
    details: sanitizeAuditDetails({
      ...(input.details ?? {}),
      ...(input.actorRole && input.actorRole !== normalizedActorRole
        ? { actor_role_source: input.actorRole }
        : {}),
    }),
    ip_address: typeof input.ipAddress === "string" ? input.ipAddress.slice(0, 64) : null,
    created_at: createdAt,
  };
}

async function writeBrowserAuditAction(client: SupabaseClient | any, input: AuditLogInput) {
  const sessionResult = await client?.auth?.getSession?.();
  const accessToken = sessionResult?.data?.session?.access_token;
  if (!accessToken) {
    throw new Error("Authenticated audit session is unavailable");
  }

  const response = await fetch("/api/platform/audit", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      details: sanitizeAuditDetails(input.details),
    }),
  });

  if (!response.ok) {
    throw new Error(`Platform audit request failed with status ${response.status}`);
  }
}

export async function logPlatformAuditAction(
  client: SupabaseClient | any,
  input: AuditLogInput,
): Promise<boolean> {
  const mode = input.mode ?? "best_effort";

  try {
    if (typeof window !== "undefined") {
      await writeBrowserAuditAction(client, input);
      return true;
    }

    const payload = buildAuditLogPayload(input);
    const { error } = await client.from("platform_audit_logs").insert(payload);
    if (error) {
      throw new Error(error.message || "Failed to persist platform audit log");
    }
    return true;
  } catch (error) {
    if (mode === "required") {
      throw error instanceof Error ? error : new Error("Required platform audit write failed");
    }

    const message = error instanceof Error ? error.message : String(error);
    console.warn("Platform audit write failed:", message);
    return false;
  }
}
