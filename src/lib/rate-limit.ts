import { getSupabaseAdminClient } from "@/lib/api/supabase-route";

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function rateLimit(identifier: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const supabaseAdmin = getSupabaseAdminClient();
  const now = Date.now();

  const { data, error } = await (supabaseAdmin as any).rpc("check_request_rate_limit", {
    _identifier: identifier,
    _limit: options.limit,
    _window_ms: options.windowMs,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  const count = Math.max(0, Number(row?.count ?? 0));
  const resetAtText = typeof row?.reset_at === "string" ? row.reset_at : null;
  const resetAt = resetAtText ? Date.parse(resetAtText) : now + options.windowMs;
  const remaining = Math.max(0, options.limit - count);

  return {
    success: Boolean(row?.allowed),
    limit: options.limit,
    remaining,
    reset: Number.isFinite(resetAt) ? resetAt : now + options.windowMs,
  };
}
