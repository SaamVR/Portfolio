import type { ProviderManifest } from "@/lib/integrations/provider-contract";
import type {
  CourierBookingInput,
  CourierConnectionRow,
  CourierCredentialRow,
  CourierOrderRow,
  CourierPublicSettings,
  CourierSecretSettings,
} from "@/lib/couriers/server";
import type { CourierSettingsSummary } from "@/lib/couriers/shared";

export type CourierProviderManifest = ProviderManifest & {
  category: "courier";
  bookingMode: "api" | "manual" | "setup_only";
  defaultSupportsCod: boolean;
  defaultSupportsCityDelivery: boolean;
};

export type CourierBookingResult = {
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  consignmentId: string | null;
  trackingNumber: string | null;
};

export type CourierProviderAdapter = {
  splitSettings: (rawSettings: unknown) => {
    publicSettings: CourierPublicSettings;
    secretSettings: CourierSecretSettings;
  };
  summarizeSettings: (publicSettings: unknown, secretSettings: unknown) => CourierSettingsSummary;
  book?: (input: {
    deps: { fetch: typeof fetch; now: () => string };
    order: CourierOrderRow;
    connection: CourierConnectionRow;
    credential: CourierCredentialRow | null;
    booking: CourierBookingInput;
  }) => Promise<CourierBookingResult>;
};

export type CourierProviderPlugin = {
  manifest: CourierProviderManifest;
  adapter: CourierProviderAdapter;
};

export function safeCourierProviderObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

export function readCourierText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export function readCourierNumber(value: unknown, fallback: number | null = null) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function readCourierPositiveNumber(value: unknown, fallback: number | null = null) {
  const numeric = readCourierNumber(value, fallback);
  return numeric !== null && numeric >= 0 ? numeric : fallback;
}

export function pickCourierSecret(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function buildSharedCourierPublicSettings(rawSettings: unknown): CourierPublicSettings {
  const settings = safeCourierProviderObject(rawSettings);
  return {
    zone_label: readCourierText(settings.zoneLabel, 120),
    service_area_name: readCourierText(settings.serviceAreaName, 120),
    pickup_contact_name: readCourierText(settings.pickupContactName, 120),
    pickup_contact_phone: readCourierText(settings.pickupContactPhone, 40),
    pickup_address: readCourierText(settings.pickupAddress, 300),
    return_contact_name: readCourierText(settings.returnContactName, 120),
    return_contact_phone: readCourierText(settings.returnContactPhone, 40),
    return_address: readCourierText(settings.returnAddress, 300),
    default_item_weight_kg: readCourierPositiveNumber(settings.defaultItemWeightKg, 0.5),
    note: readCourierText(settings.note, 300),
    sandbox_mode: settings.sandboxMode === true,
  };
}

export function buildSharedCourierSummary(publicSettings: unknown): CourierSettingsSummary {
  const settings = safeCourierProviderObject(publicSettings);
  return {
    zoneLabel: typeof settings.zone_label === "string" ? settings.zone_label : null,
    serviceAreaName: typeof settings.service_area_name === "string" ? settings.service_area_name : null,
    pickupContactName: typeof settings.pickup_contact_name === "string" ? settings.pickup_contact_name : null,
    pickupContactPhone: typeof settings.pickup_contact_phone === "string" ? settings.pickup_contact_phone : null,
    pickupAddress: typeof settings.pickup_address === "string" ? settings.pickup_address : null,
    returnContactName: typeof settings.return_contact_name === "string" ? settings.return_contact_name : null,
    returnContactPhone: typeof settings.return_contact_phone === "string" ? settings.return_contact_phone : null,
    returnAddress: typeof settings.return_address === "string" ? settings.return_address : null,
    defaultItemWeightKg: readCourierPositiveNumber(settings.default_item_weight_kg, null),
    sandboxMode: settings.sandbox_mode === true,
    note: typeof settings.note === "string" ? settings.note : null,
  };
}
