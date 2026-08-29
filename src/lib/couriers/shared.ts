import {
  getCourierProviderManifest,
  listCourierProviderManifests,
} from "@/lib/couriers/provider-registry";

export const courierProviders = listCourierProviderManifests().map((provider) => provider.id);
export type CourierProvider = string;

export const courierConnectionStatuses = ["draft", "configured", "disabled"] as const;
export type CourierConnectionStatus = typeof courierConnectionStatuses[number];
export type CourierStoredConnectionStatus = CourierConnectionStatus | "connected";
export const connectionVerificationStatuses = ["not_checked", "verified", "failed"] as const;
export type ConnectionVerificationStatus = typeof connectionVerificationStatuses[number];

export const shipmentStatuses = [
  "pending",
  "prepared",
  "booked",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "returned",
  "cancelled",
] as const;
export type ShipmentStatus = typeof shipmentStatuses[number];

export type CourierSettingsSummary = {
  zoneLabel?: string | null;
  serviceAreaName?: string | null;
  baseUrl?: string | null;
  merchantStoreId?: number | null;
  merchantOrderPrefix?: string | null;
  deliveryType?: number | null;
  itemType?: number | null;
  defaultItemWeightKg?: number | null;
  specialInstruction?: string | null;
  externalMerchantCode?: string | null;
  pickupContactName?: string | null;
  pickupContactPhone?: string | null;
  pickupAddress?: string | null;
  returnContactName?: string | null;
  returnContactPhone?: string | null;
  returnAddress?: string | null;
  sandboxMode?: boolean;
  note?: string | null;
  hasAccessToken?: boolean;
  hasApiKey?: boolean;
  hasSecretKey?: boolean;
  secretPresence?: Record<string, boolean>;
};

export type CourierConnectionRecord = {
  id: string;
  storeId: string;
  provider: CourierProvider;
  connectionKey: string;
  zoneLabel: string | null;
  serviceAreaName: string | null;
  status: CourierConnectionStatus;
  verificationStatus: ConnectionVerificationStatus;
  verificationAvailable: boolean;
  verificationError: Record<string, unknown> | null;
  lastVerificationAt: string | null;
  lastVerifiedAt: string | null;
  displayName: string | null;
  supportsCod: boolean;
  supportsCityDelivery: boolean;
  settingsSummary: CourierSettingsSummary;
  lastSyncAt: string | null;
  lastError: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentSummary = {
  id: string;
  order_id: string;
  provider: CourierProvider;
  courier_connection_id?: string | null;
  courier_connection_label?: string | null;
  zone_label?: string | null;
  service_area_name?: string | null;
  status: ShipmentStatus;
  tracking_number: string | null;
  consignment_id: string | null;
  created_at: string;
  delivered_at: string | null;
};

export function normalizeCourierConnectionStatus(status: CourierStoredConnectionStatus): CourierConnectionStatus {
  return status === "connected" ? "configured" : status;
}

export function isCourierOperationallyConfigured(status: CourierStoredConnectionStatus) {
  return status === "configured" || status === "connected";
}

export function getCourierProviderLabel(provider: CourierProvider) {
  return getCourierProviderManifest(provider)?.label ?? provider;
}

export function formatCourierConnectionLabel(input: {
  provider: CourierProvider;
  displayName?: string | null;
  zoneLabel?: string | null;
  serviceAreaName?: string | null;
}) {
  const displayName = input.displayName?.trim() || getCourierProviderLabel(input.provider);
  const zoneLabel = input.zoneLabel?.trim() || "";
  const serviceAreaName = input.serviceAreaName?.trim() || "";
  const details = [zoneLabel, serviceAreaName].filter(Boolean);

  if (details.length === 0) return displayName;
  if (details.length === 1 && details[0] === displayName) return displayName;

  const detailText = details.join(" / ");
  return detailText === displayName ? displayName : `${displayName} - ${detailText}`;
}

export function formatCourierStatusLabel(value: string) {
  return value.replace(/_/g, " ");
}
