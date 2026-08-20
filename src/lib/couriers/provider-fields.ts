import type { ProviderSetupField } from "@/lib/integrations/provider-contract";

export const sharedCourierOperationsFields: ProviderSetupField[] = [
  { key: "zoneLabel", label: "Zone label", kind: "text", scope: "public", required: true },
  { key: "serviceAreaName", label: "Service area", kind: "text", scope: "public", required: true },
  { key: "pickupContactName", label: "Pickup contact name", kind: "text", scope: "public", required: true },
  { key: "pickupContactPhone", label: "Pickup contact phone", kind: "text", scope: "public", required: true },
  { key: "pickupAddress", label: "Pickup address", kind: "text", scope: "public", required: true },
  { key: "returnContactName", label: "Return contact name", kind: "text", scope: "public", required: true },
  { key: "returnContactPhone", label: "Return contact phone", kind: "text", scope: "public", required: true },
  { key: "returnAddress", label: "Return address", kind: "text", scope: "public", required: true },
  { key: "defaultItemWeightKg", label: "Default item weight (kg)", kind: "number", scope: "public", defaultValue: 0.5 },
  { key: "note", label: "Operations note", kind: "text", scope: "public" },
];

export const genericCourierApiFields: ProviderSetupField[] = [
  ...sharedCourierOperationsFields,
  { key: "sandboxMode", label: "Sandbox mode", kind: "boolean", scope: "public", defaultValue: false },
  { key: "baseUrl", label: "API base URL", kind: "url", scope: "public" },
  { key: "externalMerchantCode", label: "Merchant code", kind: "text", scope: "public" },
  { key: "accessToken", label: "Access token", kind: "password", scope: "secret" },
  { key: "apiKey", label: "API key", kind: "password", scope: "secret" },
  { key: "secretKey", label: "Secret key", kind: "password", scope: "secret" },
];
