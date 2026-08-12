type RecordValue = Record<string, unknown>;

export type BkashConnectionStatus = "draft" | "connected" | "revoked";

export type BkashPaymentConnectionRow = {
  id: string;
  store_id: string;
  provider: "bkash";
  status: BkashConnectionStatus;
  public_metadata: RecordValue | null;
  secret_payload: RecordValue | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
};

export function safeObject(value: unknown): RecordValue {
  return typeof value === "object" && value !== null ? value as RecordValue : {};
}

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function pickSecretValue(value: unknown) {
  const text = readText(value, 2000);
  return text ? text : undefined;
}

export function splitBkashConnectionSettings(rawSettings: unknown) {
  const settings = safeObject(rawSettings);
  const isLive = settings.isLive === true || settings.bkash_is_live === true;
  const forceTestMode = settings.forceTestMode === true || settings.testMode === true;
  const baseUrl = readText(settings.baseUrl ?? settings.bkash_base_url, 500);

  return {
    publicMetadata: {
      is_live: isLive,
      environment: isLive ? "live" : "sandbox",
      force_test_mode: forceTestMode,
      base_url: baseUrl || null,
      label: readText(settings.label, 120) || "bKash PGW",
      app_key_hint: maskText(readText(settings.appKey ?? settings.bkash_app_key, 500)),
      username_hint: maskText(readText(settings.username ?? settings.bkash_username, 500)),
    },
    secretPayload: {
      ...(pickSecretValue(settings.appKey ?? settings.bkash_app_key) ? { app_key: pickSecretValue(settings.appKey ?? settings.bkash_app_key) } : {}),
      ...(pickSecretValue(settings.appSecret ?? settings.bkash_app_secret) ? { app_secret: pickSecretValue(settings.appSecret ?? settings.bkash_app_secret) } : {}),
      ...(pickSecretValue(settings.username ?? settings.bkash_username) ? { username: pickSecretValue(settings.username ?? settings.bkash_username) } : {}),
      ...(pickSecretValue(settings.password ?? settings.bkash_password) ? { password: pickSecretValue(settings.password ?? settings.bkash_password) } : {}),
    },
  };
}

export function hasCompleteBkashSecrets(secretPayload: unknown) {
  const secrets = safeObject(secretPayload);
  return Boolean(
    readText(secrets.app_key, 500)
    && readText(secrets.app_secret, 500)
    && readText(secrets.username, 500)
    && readText(secrets.password, 500),
  );
}

export function maskText(value: string) {
  if (!value) return null;
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

export function buildBkashConnectionResponse(row: BkashPaymentConnectionRow | null) {
  if (!row) {
    return {
      provider: "bkash" as const,
      configured: false,
      status: "draft" as BkashConnectionStatus,
      metadata: {
        environment: "sandbox",
        forceTestMode: false,
        baseUrl: null,
        label: "bKash PGW",
        appKeyHint: null,
        usernameHint: null,
      },
      updatedAt: null,
      revokedAt: null,
    };
  }

  const metadata = safeObject(row.public_metadata);
  const complete = hasCompleteBkashSecrets(row.secret_payload);

  return {
    id: row.id,
    provider: "bkash" as const,
    configured: row.status === "connected" && complete,
    status: row.status,
    metadata: {
      environment: metadata.environment === "live" ? "live" : "sandbox",
      forceTestMode: metadata.force_test_mode === true,
      baseUrl: typeof metadata.base_url === "string" && metadata.base_url.trim().length > 0 ? metadata.base_url.trim() : null,
      label: readText(metadata.label, 120) || "bKash PGW",
      appKeyHint: typeof metadata.app_key_hint === "string" ? metadata.app_key_hint : null,
      usernameHint: typeof metadata.username_hint === "string" ? metadata.username_hint : null,
    },
    updatedAt: row.updated_at,
    revokedAt: row.revoked_at,
  };
}
