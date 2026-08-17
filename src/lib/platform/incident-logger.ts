import type { SupabaseClient } from "@supabase/supabase-js";

type IncidentSeverity = "critical" | "warning" | "prewarning" | "info";

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

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim();
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown application error";
  }
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
) {
  const rpc = (supabaseAdmin as SupabaseClient & { rpc?: SupabaseClient["rpc"] }).rpc;
  // Minimal route-test doubles intentionally omit rpc(). Production Supabase
  // clients always expose it, so silently skip persistence only for those doubles.
  if (typeof rpc !== "function") return;

  try {
    const { error } = await rpc.call(supabaseAdmin, "record_platform_incident", {
      p_fingerprint: input.fingerprint,
      p_severity: input.severity,
      p_source: input.source,
      p_title: input.title,
      p_message: input.message,
      p_route: input.route ?? null,
      p_store_id: input.storeId ?? null,
      p_request_id: input.requestId ?? null,
      p_metadata: input.metadata ?? {},
    });

    if (error) {
      console.error("Platform incident persistence failed:", error);
    }
  } catch (error) {
    // Incident logging must never replace the original application failure.
    console.error("Platform incident persistence threw:", error);
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
