import type { SupabaseClient } from "@supabase/supabase-js";
import { logPlatformAuditAction } from "@/lib/platform/audit-logger";

export interface SystemServiceStatus {
  key: string;
  name: string;
  category: string;
  status: "operational" | "degraded" | "maintenance" | "outage";
  lastPingMs?: number;
  lastCheckedAt?: string;
}

export interface PlatformGlobalSettings {
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  allowedIpAddresses: string[];

  broadcastBannerEnabled: boolean;
  broadcastBannerMessage: string;
  broadcastBannerVariant: "info" | "warning" | "critical" | "success";
  broadcastBannerDismissible: boolean;
  broadcastBannerTargetScope: "all_merchants" | "free_merchants" | "paid_merchants";

  services: SystemServiceStatus[];

  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_PLATFORM_GLOBAL_SETTINGS: PlatformGlobalSettings = {
  maintenanceMode: false,
  maintenanceTitle: "Platform Maintenance in Progress",
  maintenanceMessage: "The COMMERCE Engine platform is currently undergoing scheduled maintenance. Storefront checkout and merchant admin services will resume shortly.",
  allowedIpAddresses: [],

  broadcastBannerEnabled: false,
  broadcastBannerMessage: "Scheduled platform upgrade notice: All services are operational.",
  broadcastBannerVariant: "info",
  broadcastBannerDismissible: true,
  broadcastBannerTargetScope: "all_merchants",

  services: [
    { key: "bkash", name: "bKash Payment Gateway", category: "Payments", status: "operational", lastPingMs: 42, lastCheckedAt: new Date().toISOString() },
    { key: "cloudinary", name: "Cloudinary Asset Storage", category: "Storage & Media", status: "operational", lastPingMs: 65, lastCheckedAt: new Date().toISOString() },
    { key: "cloudflare", name: "Cloudflare Edge CDN", category: "Network & DNS", status: "operational", lastPingMs: 18, lastCheckedAt: new Date().toISOString() },
    { key: "database", name: "Supabase Database Cluster", category: "Database & Sync", status: "operational", lastPingMs: 32, lastCheckedAt: new Date().toISOString() },
    { key: "email", name: "Cloudflare Email SMTP Gateway", category: "Notifications", status: "operational", lastPingMs: 88, lastCheckedAt: new Date().toISOString() },
  ],
};

const STORAGE_KEY = "commerce_platform_global_settings_v1";

export async function fetchPlatformGlobalSettings(
  client?: SupabaseClient<any> | null
): Promise<PlatformGlobalSettings> {
  if (client) {
    try {
      const { data, error } = await (client as any)
        .from("site_settings")
        .select("value")
        .eq("store_id", "00000000-0000-0000-0000-000000000000")
        .eq("key", "platform_global_settings")
        .maybeSingle();

      if (!error && data?.value) {
        return {
          ...DEFAULT_PLATFORM_GLOBAL_SETTINGS,
          ...(typeof data.value === "object" ? data.value : JSON.parse(data.value)),
        };
      }
    } catch (e) {
      console.warn("Failed to fetch platform global settings from Supabase, falling back to local cache:", e);
    }
  }

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        return {
          ...DEFAULT_PLATFORM_GLOBAL_SETTINGS,
          ...JSON.parse(cached),
        };
      } catch (e) {
        // Fall back to default
      }
    }
  }

  return DEFAULT_PLATFORM_GLOBAL_SETTINGS;
}

export async function savePlatformGlobalSettings(
  client: SupabaseClient<any> | null,
  settings: PlatformGlobalSettings,
  actor: { userId?: string; userEmail?: string; userRole?: string }
): Promise<{ success: boolean; error?: string }> {
  const updatedPayload: PlatformGlobalSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: actor.userEmail || actor.userId || "platform_admin",
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPayload));
  }

  if (client) {
    try {
      const { error } = await (client as any).from("site_settings").upsert(
        {
          store_id: "00000000-0000-0000-0000-000000000000",
          key: "platform_global_settings",
          value: updatedPayload,
        },
        { onConflict: "store_id,key" }
      );

      if (error) {
        console.error("Supabase global settings save error:", error);
      }

      await logPlatformAuditAction(client, {
        actorId: actor.userId,
        actorEmail: actor.userEmail,
        actorRole: actor.userRole,
        action: "update_global_platform_settings",
        targetType: "system_settings",
        targetId: "global",
        details: {
          maintenance_mode: settings.maintenanceMode,
          broadcast_enabled: settings.broadcastBannerEnabled,
          broadcast_variant: settings.broadcastBannerVariant,
          updated_at: updatedPayload.updatedAt,
        },
      });
    } catch (err: any) {
      console.error("Failed to persist global settings to DB:", err);
    }
  }

  return { success: true };
}
