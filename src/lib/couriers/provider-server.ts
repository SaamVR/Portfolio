import type {
  CourierConnectionRow,
  CourierCredentialRow,
} from "@/lib/couriers/server";
import { getCourierProviderPlugin } from "@/lib/couriers/provider-registry";
import {
  safeCourierProviderObject,
  type CourierBookingResult,
  type CourierProviderAdapter,
  type CourierProviderManifest,
} from "@/lib/couriers/provider-plugin";
import { normalizeCourierConnectionStatus } from "@/lib/couriers/shared";

export { safeCourierProviderObject } from "@/lib/couriers/provider-plugin";
export type { CourierBookingResult } from "@/lib/couriers/provider-plugin";

export type CourierProviderServerAdapter = CourierProviderAdapter & {
  manifest: CourierProviderManifest;
};

export function getCourierProviderServerAdapter(provider: unknown): CourierProviderServerAdapter | null {
  const plugin = getCourierProviderPlugin(provider);
  if (!plugin) return null;
  return { manifest: plugin.manifest, ...plugin.adapter };
}

export function requireCourierProviderServerAdapter(provider: unknown) {
  const adapter = getCourierProviderServerAdapter(provider);
  if (!adapter || adapter.manifest.runtimeStatus === "disabled") {
    throw new Error("Unsupported or disabled courier provider");
  }
  return adapter;
}

export function isCourierProviderConfigurationComplete(
  adapter: CourierProviderServerAdapter,
  publicSettings: unknown,
  secretSettings: unknown,
) {
  return adapter.isConfigurationComplete
    ? adapter.isConfigurationComplete(publicSettings, secretSettings)
    : false;
}

export function buildCourierProviderConnectionResponse(
  row: CourierConnectionRow,
  credential: CourierCredentialRow | null,
) {
  const adapter = requireCourierProviderServerAdapter(row.provider);
  const verificationRow = row as CourierConnectionRow & {
    verification_status?: "not_checked" | "verified" | "failed" | null;
    last_verification_at?: string | null;
    last_verified_at?: string | null;
    verification_error?: Record<string, unknown> | null;
  };
  return {
    id: row.id,
    storeId: row.store_id,
    provider: row.provider,
    connectionKey: row.connection_key,
    zoneLabel: row.zone_label,
    serviceAreaName: row.service_area_name,
    status: normalizeCourierConnectionStatus(row.status as "draft" | "configured" | "disabled" | "connected"),
    verificationStatus: verificationRow.verification_status ?? "not_checked",
    verificationAvailable: Boolean(adapter.verifyConnection),
    verificationError: verificationRow.verification_error ?? null,
    lastVerificationAt: verificationRow.last_verification_at ?? null,
    lastVerifiedAt: verificationRow.last_verified_at ?? null,
    displayName: row.display_name,
    supportsCod: row.supports_cod,
    supportsCityDelivery: row.supports_city_delivery,
    settingsSummary: adapter.summarizeSettings(row.settings, credential?.secret_payload ?? {}),
    lastSyncAt: row.last_sync_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CourierProviderServerBookingResult = CourierBookingResult;
