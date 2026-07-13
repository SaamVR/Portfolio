import { DEFAULT_STORE_ID } from "@/lib/cms/default-store";

export const PLATFORM_FEATURE_ORDER = [
  "cms_pages",
  "launch_templates",
  "media_library",
  "backup_import",
  "custom_domains",
  "staff_management",
  "theme_presets",
  "advanced_analytics",
  "automations",
  "scheduled_backups",
  "lifecycle_recovery",
] as const;

export type PlatformFeatureKey = (typeof PLATFORM_FEATURE_ORDER)[number];

export type CmsFeatureRecord = {
  key: string;
  name: string;
  description: string;
  category: string;
  default_visible: boolean;
  is_active: boolean;
};

export type EntitlementReason =
  | "platform_admin"
  | "global_disabled"
  | "plan_enabled"
  | "plan_disabled"
  | "store_override_enabled"
  | "store_override_disabled"
  | "email_override_enabled"
  | "email_override_disabled";

export type EffectiveFeatureState = {
  key: string;
  enabled: boolean;
  reason: EntitlementReason;
  sources: {
    planEnabled: boolean;
    storeOverride?: boolean;
    emailOverride?: boolean;
  };
};

export type StoreLifecycleStatus = "active" | "at_risk" | "reminded" | "archived" | "pending_delete" | "deleted";

export type StoreLifecycleStateRecord = {
  store_id: string;
  lifecycle_status: StoreLifecycleStatus;
  status_reason: string | null;
  last_activity_at: string | null;
  last_storefront_activity_at: string | null;
  reminder_count: number;
  reminder_1_sent_at: string | null;
  reminder_2_sent_at: string | null;
  reminder_3_sent_at: string | null;
  last_reminder_at: string | null;
  next_reminder_at: string | null;
  archived_at: string | null;
  scheduled_delete_at: string | null;
  deleted_at: string | null;
  manual_hold: boolean;
};

export const PLATFORM_ROUTE_ENTITLEMENTS: Record<string, PlatformFeatureKey> = {
  "/admin/page-builder": "cms_pages",
  "/admin/cms": "cms_pages",
  "/admin/media": "media_library",
  "/admin/backup": "backup_import",
};

export function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

export function getDefaultLifecycleState(storeId: string = DEFAULT_STORE_ID): StoreLifecycleStateRecord {
  return {
    store_id: storeId,
    lifecycle_status: "active",
    status_reason: null,
    last_activity_at: null,
    last_storefront_activity_at: null,
    reminder_count: 0,
    reminder_1_sent_at: null,
    reminder_2_sent_at: null,
    reminder_3_sent_at: null,
    last_reminder_at: null,
    next_reminder_at: null,
    archived_at: null,
    scheduled_delete_at: null,
    deleted_at: null,
    manual_hold: false,
  };
}

export function resolveEffectiveFeatures({
  features,
  planMappings,
  storeOverrides,
  emailOverrides,
  isPlatformAdmin,
}: {
  features: CmsFeatureRecord[];
  planMappings: Array<{ feature_key: string; enabled: boolean }>;
  storeOverrides: Array<{ feature_key: string; enabled: boolean }>;
  emailOverrides: Array<{ feature_key: string; enabled: boolean }>;
  isPlatformAdmin: boolean;
}) {
  const planMap = new Map(planMappings.map((row) => [row.feature_key, row.enabled]));
  const storeMap = new Map(storeOverrides.map((row) => [row.feature_key, row.enabled]));
  const emailMap = new Map(emailOverrides.map((row) => [row.feature_key, row.enabled]));

  const result = new Map<string, EffectiveFeatureState>();

  for (const feature of features) {
    const planEnabled = planMap.get(feature.key) ?? false;
    const storeOverride = storeMap.get(feature.key);
    const emailOverride = emailMap.get(feature.key);

    if (isPlatformAdmin) {
      result.set(feature.key, {
        key: feature.key,
        enabled: true,
        reason: "platform_admin",
        sources: { planEnabled, storeOverride, emailOverride },
      });
      continue;
    }

    if (!feature.is_active) {
      result.set(feature.key, {
        key: feature.key,
        enabled: false,
        reason: "global_disabled",
        sources: { planEnabled, storeOverride, emailOverride },
      });
      continue;
    }

    let enabled = planEnabled;
    let reason: EntitlementReason = planEnabled ? "plan_enabled" : "plan_disabled";

    if (typeof storeOverride === "boolean") {
      enabled = storeOverride;
      reason = storeOverride ? "store_override_enabled" : "store_override_disabled";
    }

    if (typeof emailOverride === "boolean") {
      enabled = emailOverride;
      reason = emailOverride ? "email_override_enabled" : "email_override_disabled";
    }

    result.set(feature.key, {
      key: feature.key,
      enabled,
      reason,
      sources: { planEnabled, storeOverride, emailOverride },
    });
  }

  return result;
}

export function getFeatureEnabled(
  featureMap: Map<string, EffectiveFeatureState> | null | undefined,
  featureKey: string,
  fallback = false,
) {
  return featureMap?.get(featureKey)?.enabled ?? fallback;
}

export function getLifecycleStatusForDate(lastActivityAt: Date | null, now: Date = new Date()): StoreLifecycleStatus {
  if (!lastActivityAt) {
    return "at_risk";
  }

  const daysInactive = Math.floor((now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysInactive >= 111) return "pending_delete";
  if (daysInactive >= 81) return "archived";
  if (daysInactive >= 60) return "reminded";
  if (daysInactive >= 45) return "at_risk";
  return "active";
}
