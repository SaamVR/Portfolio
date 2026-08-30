import type { SupabaseClient } from "@supabase/supabase-js";

export type IncidentSeverity = "critical" | "warning" | "prewarning" | "info";

type PlatformIncidentInput = {
  fingerprint: string;
  severity: IncidentSeverity;
  source: string;
  title: string;
  message: string;
  route?: string | null;
  storeId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
};

const MAX_INCIDENT_DEPTH = 4;
const MAX_INCIDENT_KEYS = 30;
const MAX_INCIDENT_ARRAY_ITEMS = 20;
const MAX_INCIDENT_STRING_LENGTH = 1_000;
const MAX_INCIDENT_METADATA_BYTES = 8 * 1_024;
const REDACTED = "[redacted]";
const TRUNCATED = "[truncated]";

const SENSITIVE_KEY_MARKERS = [
  "secret",
  "token",
  "password",
  "passwd",
  "authorization",
  "cookie",
  "credential",
  "apikey",
  "privatekey",
  "signingkey",
  "encryptionkey",
  "servicerole",
  "accesskey",
  "refreshtoken",
  "sessiontoken",
  "clientsecret",
  "webhooksecret",
  "securepayload",
  "signature",
];

function normalizeSensitiveKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveIncidentKey(key: string) {
  const normalized = normalizeSensitiveKey(key);
  return SENSITIVE_KEY_MARKERS.some((marker) => normalized.includes(marker));
}

function scrubSecretLikeText(input: string) {
  return input
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[redacted-jwt]")
    .replace(/\b((?:postgres(?:ql)?|https?):\/\/[^:\s/@]+:)[^@\s/]+@/gi, "$1[redacted]@")
    .replace(/([?&](?:access[_-]?token|refresh[_-]?token|token|api[_-]?key|apikey|secret|password|passwd|client[_-]?secret|signature)=)[^&#\s]+/gi, "$1[redacted]")
    .replace(/\b(authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd|secret)\s*[:=]\s*(?:Bearer\s+)?["']?[^,\s;"']{6,}["']?/gi, "$1=[redacted]");
}

export function sanitizeIncidentText(value: unknown, maxLength = MAX_INCIDENT_STRING_LENGTH) {
  try {
    const text = typeof value === "string"
      ? value
      : value instanceof Error
        ? value.message
        : value && typeof value === "object" && typeof (value as { message?: unknown }).message === "string"
          ? (value as { message: string }).message
          : value === null || value === undefined
            ? ""
            : String(value);
    return scrubSecretLikeText(text).slice(0, Math.max(0, maxLength));
  } catch {
    return "[redacted-unprintable]".slice(0, Math.max(0, maxLength));
  }
}

function sanitizeIncidentValue(value: unknown, depth: number): unknown {
  if (depth > MAX_INCIDENT_DEPTH) return TRUNCATED;
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return sanitizeIncidentText(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: sanitizeIncidentText(value.name, 120),
      message: sanitizeIncidentText(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_INCIDENT_ARRAY_ITEMS)
      .map((item) => sanitizeIncidentValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>).slice(0, MAX_INCIDENT_KEYS)) {
      const safeKey = key.slice(0, 100);
      result[safeKey] = isSensitiveIncidentKey(key)
        ? REDACTED
        : sanitizeIncidentValue(nestedValue, depth + 1);
    }
    return result;
  }

  return null;
}

function metadataByteLength(metadata: Record<string, unknown>) {
  return new TextEncoder().encode(JSON.stringify(metadata)).byteLength;
}

function boundIncidentMetadata(metadata: Record<string, unknown>) {
  if (metadataByteLength(metadata) <= MAX_INCIDENT_METADATA_BYTES) return metadata;

  const bounded: Record<string, unknown> = {};
  const entryBudget = MAX_INCIDENT_METADATA_BYTES - 64;
  for (const [key, value] of Object.entries(metadata)) {
    const candidate = { ...bounded, [key]: value };
    if (metadataByteLength(candidate) > entryBudget) break;
    bounded[key] = value;
  }
  bounded._truncated = TRUNCATED;
  return bounded;
}

export function sanitizeIncidentMetadata(metadata?: Record<string, unknown>) {
  try {
    const sanitized = (sanitizeIncidentValue(metadata ?? {}, 0) ?? {}) as Record<string, unknown>;
    return boundIncidentMetadata(sanitized);
  } catch {
    return { _sanitization_error: TRUNCATED };
  }
}

function normalizeErrorMessage(error: unknown) {
  const message = sanitizeIncidentText(error, 4_000);
  return message || "Unknown application error";
}

export function getRequestId(req: Request) {
  return req.headers.get("x-request-id")
    || req.headers.get("x-vercel-id")
    || req.headers.get("cf-ray")
    || null;
}

export async function recordPlatformIncident(
  supabaseAdmin: SupabaseClient,
  input: PlatformIncidentInput,
): Promise<boolean> {
  try {
    const rpc = (supabaseAdmin as SupabaseClient & { rpc?: SupabaseClient["rpc"] }).rpc;
    // Minimal route-test doubles intentionally omit rpc(). Production Supabase
    // clients always expose it, so silently skip persistence only for those doubles.
    if (typeof rpc !== "function") return false;

    const fingerprint = sanitizeIncidentText(input.fingerprint, 180).trim();
    if (!fingerprint) {
      console.warn("Platform incident skipped: empty fingerprint");
      return false;
    }

    const storeScope = sanitizeIncidentText(input.storeId, 64).trim();
    const scopedFingerprint = (storeScope ? `${fingerprint}:${storeScope}` : fingerprint).slice(0, 240);
    const metadata = sanitizeIncidentMetadata(input.metadata);

    const { error } = await rpc.call(supabaseAdmin, "record_platform_incident", {
      p_fingerprint: scopedFingerprint,
      p_severity: input.severity,
      p_source: sanitizeIncidentText(input.source, 120).trim() || "application",
      p_title: sanitizeIncidentText(input.title, 240).trim() || "Application incident",
      p_message: sanitizeIncidentText(input.message, 4_000) || "Unknown application incident",
      p_route: input.route ? sanitizeIncidentText(input.route, 500) || null : null,
      p_store_id: input.storeId ?? null,
      p_request_id: input.requestId ? sanitizeIncidentText(input.requestId, 200) || null : null,
      p_metadata: metadata,
    });

    if (error) {
      console.error("Platform incident persistence failed:", normalizeErrorMessage(error));
      return false;
    }
    return true;
  } catch (error) {
    // Incident logging must never replace the original application failure.
    console.error("Platform incident persistence threw:", normalizeErrorMessage(error));
    return false;
  }
}

export async function recordCaughtIncident(
  supabaseAdmin: SupabaseClient,
  input: Omit<PlatformIncidentInput, "message"> & { error: unknown },
) {
  return recordPlatformIncident(supabaseAdmin, {
    ...input,
    message: normalizeErrorMessage(input.error),
  });
}
