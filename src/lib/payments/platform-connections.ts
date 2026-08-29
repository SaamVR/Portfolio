import {
  buildBkashConnectionResponse,
  hasCompleteBkashSecrets,
  safeObject,
  splitBkashConnectionSettings,
  type BkashConnectionStatus,
} from "@/lib/payments/merchant-connections";
import { isPaymentOperationallyConfigured } from "@/lib/payments/provider-server";

type RecordValue = Record<string, unknown>;

export type PlatformBkashConnectionRow = {
  id: string;
  provider: "bkash";
  status: BkashConnectionStatus | "connected";
  verification_status: "not_checked" | "verified" | "failed";
  last_verification_at: string | null;
  last_verified_at: string | null;
  verification_error: RecordValue | null;
  public_metadata: RecordValue | null;
  secret_payload: RecordValue | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
};

const connectionSelect = "id, provider, status, verification_status, last_verification_at, last_verified_at, verification_error, public_metadata, secret_payload, created_at, updated_at, revoked_at";

export function buildPlatformBkashConnectionResponse(row: PlatformBkashConnectionRow | null) {
  return buildBkashConnectionResponse(
    row
      ? {
          ...row,
          store_id: "platform",
        }
      : null,
  );
}

export { safeObject };

export async function readPlatformBkashConnection(supabaseAdmin: any) {
  const { data, error } = await supabaseAdmin
    .from("platform_payment_connections_secure")
    .select(connectionSelect)
    .eq("provider", "bkash")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as PlatformBkashConnectionRow | null;
}

export function splitPlatformBkashConnectionSettings(rawSettings: unknown) {
  return splitBkashConnectionSettings(rawSettings);
}

export function hasCompletePlatformBkashSecrets(secretPayload: unknown) {
  return hasCompleteBkashSecrets(secretPayload);
}

export function getPlatformBkashCredentialsFromConnection(row: PlatformBkashConnectionRow | null) {
  if (!row || !isPaymentOperationallyConfigured(row.status)) return null;

  const metadata = safeObject(row.public_metadata);
  const secrets = safeObject(row.secret_payload);

  if (!hasCompletePlatformBkashSecrets(secrets)) return null;

  return {
    isLive: metadata.environment === "live" || metadata.is_live === true,
    forceTestMode: metadata.force_test_mode === true,
    baseUrl: typeof metadata.base_url === "string" && metadata.base_url.trim().length > 0 ? metadata.base_url.trim() : "",
    appKey: typeof secrets.app_key === "string" ? secrets.app_key : "",
    appSecret: typeof secrets.app_secret === "string" ? secrets.app_secret : "",
    username: typeof secrets.username === "string" ? secrets.username : "",
    password: typeof secrets.password === "string" ? secrets.password : "",
  };
}
