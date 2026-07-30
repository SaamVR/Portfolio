import type { CourierProvider, CourierSettingsSummary } from "@/lib/couriers/shared";

type RecordValue = Record<string, unknown>;

export type CourierPublicSettings = RecordValue;
export type CourierSecretSettings = RecordValue;

export type CourierConnectionRow = {
  id: string;
  store_id: string;
  provider: CourierProvider;
  connection_key: string;
  zone_label: string | null;
  service_area_name: string | null;
  status: string;
  display_name: string | null;
  supports_cod: boolean;
  supports_city_delivery: boolean;
  settings: RecordValue | null;
  last_sync_at: string | null;
  last_error: RecordValue | null;
  created_at: string;
  updated_at: string;
};

export type CourierCredentialRow = {
  connection_id: string;
  store_id: string;
  provider: CourierProvider;
  secret_payload: RecordValue | null;
};

export type CourierOrderRow = {
  id: string;
  store_id: string;
  order_number: string;
  status: string;
  items: Array<Record<string, unknown>>;
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  payment_method: string;
  total: number;
  delivery_fee: number;
  notes: string | null;
};

export type CourierBookingInput = {
  itemWeightKg?: number | null;
  itemQuantity?: number | null;
  itemDescription?: string | null;
  specialInstruction?: string | null;
  amountToCollect?: number | null;
  shippingFee?: number | null;
  merchantOrderId?: string | null;
};

export function safeObject(value: unknown) {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function readNumber(value: unknown, fallback: number | null = null) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function readPositiveNumber(value: unknown, fallback: number | null = null) {
  const numeric = readNumber(value, fallback);
  if (numeric === null) return fallback;
  return numeric >= 0 ? numeric : fallback;
}

function pickSecretValue(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function buildCourierConnectionKey(provider: CourierProvider, rawSettings: unknown) {
  const settings = safeObject(rawSettings);
  const explicit = readText(settings.connectionKey, 80);
  if (explicit) return explicit;

  const zoneLabel = readText(settings.zoneLabel, 120);
  const serviceAreaName = readText(settings.serviceAreaName, 120);
  const source = `${zoneLabel || serviceAreaName || provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `${provider}-${Date.now()}`;
}

export function splitCourierSettings(
  provider: CourierProvider,
  rawSettings: unknown,
): { publicSettings: CourierPublicSettings; secretSettings: CourierSecretSettings } {
  const settings = safeObject(rawSettings);
  const sharedPublicSettings = {
    zone_label: readText(settings.zoneLabel, 120),
    service_area_name: readText(settings.serviceAreaName, 120),
    pickup_contact_name: readText(settings.pickupContactName, 120),
    pickup_contact_phone: readText(settings.pickupContactPhone, 40),
    pickup_address: readText(settings.pickupAddress, 300),
    return_contact_name: readText(settings.returnContactName, 120),
    return_contact_phone: readText(settings.returnContactPhone, 40),
    return_address: readText(settings.returnAddress, 300),
    default_item_weight_kg: readPositiveNumber(settings.defaultItemWeightKg, 0.5),
    note: readText(settings.note, 300),
    sandbox_mode: settings.sandboxMode === true,
  };

  if (provider === "pathao") {
    return {
      publicSettings: {
        ...sharedPublicSettings,
        base_url: readText(settings.baseUrl, 300),
        merchant_store_id: readPositiveNumber(settings.merchantStoreId, null),
        merchant_order_prefix: readText(settings.merchantOrderPrefix, 40),
        delivery_type: readPositiveNumber(settings.deliveryType, 48),
        item_type: readPositiveNumber(settings.itemType, 2),
        special_instruction: readText(settings.specialInstruction, 300),
      },
      secretSettings: {
        ...(pickSecretValue(settings.accessToken) ? { access_token: pickSecretValue(settings.accessToken) } : {}),
      },
    };
  }

  return {
    publicSettings: {
      ...sharedPublicSettings,
      base_url: readText(settings.baseUrl, 300),
      external_merchant_code: readText(settings.externalMerchantCode, 120),
    },
    secretSettings: {
      ...(pickSecretValue(settings.accessToken) ? { access_token: pickSecretValue(settings.accessToken) } : {}),
      ...(pickSecretValue(settings.apiKey) ? { api_key: pickSecretValue(settings.apiKey) } : {}),
      ...(pickSecretValue(settings.secretKey) ? { secret_key: pickSecretValue(settings.secretKey) } : {}),
    },
  };
}

export function maskCourierSettings(
  provider: CourierProvider,
  publicSettings: unknown,
  secretSettings: unknown,
): CourierSettingsSummary {
  const settings = safeObject(publicSettings);
  const secrets = safeObject(secretSettings);
  const sharedSummary = {
    zoneLabel: typeof settings.zone_label === "string" ? settings.zone_label : null,
    serviceAreaName: typeof settings.service_area_name === "string" ? settings.service_area_name : null,
    pickupContactName: typeof settings.pickup_contact_name === "string" ? settings.pickup_contact_name : null,
    pickupContactPhone: typeof settings.pickup_contact_phone === "string" ? settings.pickup_contact_phone : null,
    pickupAddress: typeof settings.pickup_address === "string" ? settings.pickup_address : null,
    returnContactName: typeof settings.return_contact_name === "string" ? settings.return_contact_name : null,
    returnContactPhone: typeof settings.return_contact_phone === "string" ? settings.return_contact_phone : null,
    returnAddress: typeof settings.return_address === "string" ? settings.return_address : null,
    defaultItemWeightKg: readPositiveNumber(settings.default_item_weight_kg, null),
    sandboxMode: settings.sandbox_mode === true,
    note: typeof settings.note === "string" ? settings.note : null,
  };

  if (provider === "pathao") {
    return {
      ...sharedSummary,
      baseUrl: typeof settings.base_url === "string" ? settings.base_url : null,
      merchantStoreId: readPositiveNumber(settings.merchant_store_id, null),
      merchantOrderPrefix: typeof settings.merchant_order_prefix === "string" ? settings.merchant_order_prefix : null,
      deliveryType: readPositiveNumber(settings.delivery_type, null),
      itemType: readPositiveNumber(settings.item_type, null),
      specialInstruction: typeof settings.special_instruction === "string" ? settings.special_instruction : null,
      hasAccessToken: Boolean(readText(secrets.access_token, 500)),
    };
  }

  return {
    ...sharedSummary,
    baseUrl: typeof settings.base_url === "string" ? settings.base_url : null,
    externalMerchantCode: typeof settings.external_merchant_code === "string" ? settings.external_merchant_code : null,
    hasAccessToken: Boolean(readText(secrets.access_token, 500)),
    hasApiKey: Boolean(readText(secrets.api_key, 500)),
    hasSecretKey: Boolean(readText(secrets.secret_key, 500)),
  };
}

export function buildCourierConnectionResponse(
  row: CourierConnectionRow,
  secretSettings: unknown,
) {
  return {
    id: row.id,
    storeId: row.store_id,
    provider: row.provider,
    connectionKey: row.connection_key,
    zoneLabel: row.zone_label,
    serviceAreaName: row.service_area_name,
    status: row.status,
    displayName: row.display_name,
    supportsCod: row.supports_cod,
    supportsCityDelivery: row.supports_city_delivery,
    settingsSummary: maskCourierSettings(row.provider, row.settings, secretSettings),
    lastSyncAt: row.last_sync_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getOrderItemSummary(order: CourierOrderRow) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemQuantity = items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity ?? 1)), 0);
  const itemDescription = items
    .map((item) => (typeof item.name === "string" ? item.name.trim() : "Item"))
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  return {
    itemQuantity: itemQuantity || 1,
    itemDescription: itemDescription || `Order ${order.order_number}`,
  };
}

export function buildManualShipmentPayload(
  order: CourierOrderRow,
  connection: CourierConnectionRow,
  bookingInput: CourierBookingInput,
) {
  const summary = getOrderItemSummary(order);
  const settings = safeObject(connection.settings);
  const itemWeightKg = readPositiveNumber(bookingInput.itemWeightKg, readPositiveNumber(settings.default_item_weight_kg, 0.5)) ?? 0.5;
  const itemQuantity = readPositiveNumber(bookingInput.itemQuantity, summary.itemQuantity) ?? summary.itemQuantity;
  const itemDescription = readText(bookingInput.itemDescription, 300) ?? summary.itemDescription;
  const specialInstruction = readText(bookingInput.specialInstruction, 300) ?? readText(settings.note, 300);
  const amountToCollect = readPositiveNumber(
    bookingInput.amountToCollect,
    /cod/i.test(order.payment_method) ? order.total : 0,
  ) ?? 0;
  const shippingFee = readPositiveNumber(bookingInput.shippingFee, order.delivery_fee) ?? order.delivery_fee;

  return {
    merchantOrderId: readText(bookingInput.merchantOrderId, 80) ?? order.order_number,
    itemWeightKg,
    itemQuantity,
    itemDescription,
    specialInstruction,
    amountToCollect,
    shippingFee,
  };
}

export async function createPathaoBooking(
  deps: { fetch: typeof fetch },
  order: CourierOrderRow,
  connection: CourierConnectionRow,
  secretSettings: unknown,
  bookingInput: CourierBookingInput,
) {
  const publicSettings = safeObject(connection.settings);
  const privateSettings = safeObject(secretSettings);
  const baseUrl = readText(publicSettings.base_url, 300);
  const accessToken = readText(privateSettings.access_token, 2000);
  const merchantStoreId = readPositiveNumber(publicSettings.merchant_store_id, null);

  if (!baseUrl || !accessToken || !merchantStoreId) {
    throw new Error("Pathao credentials are incomplete. Add the API base URL, access token, and merchant store ID first.");
  }

  const fallbackPrefix = readText(publicSettings.merchant_order_prefix, 40);
  const summary = getOrderItemSummary(order);
  const itemWeightKg = readPositiveNumber(bookingInput.itemWeightKg, readPositiveNumber(publicSettings.default_item_weight_kg, 0.5)) ?? 0.5;
  const itemQuantity = readPositiveNumber(bookingInput.itemQuantity, summary.itemQuantity) ?? summary.itemQuantity;
  const itemDescription = readText(bookingInput.itemDescription, 300) ?? summary.itemDescription;
  const specialInstruction = readText(bookingInput.specialInstruction, 300) ?? readText(publicSettings.special_instruction, 300);
  const amountToCollect = readPositiveNumber(
    bookingInput.amountToCollect,
    /cod/i.test(order.payment_method) ? order.total : 0,
  ) ?? 0;

  const payload = {
    store_id: merchantStoreId,
    merchant_order_id: readText(bookingInput.merchantOrderId, 80) ?? `${fallbackPrefix ? `${fallbackPrefix}-` : ""}${order.order_number}`,
    recipient_name: order.customer_name,
    recipient_phone: order.customer_phone,
    recipient_address: `${order.shipping_address}, ${order.shipping_city}`,
    delivery_type: readPositiveNumber(publicSettings.delivery_type, 48) ?? 48,
    item_type: readPositiveNumber(publicSettings.item_type, 2) ?? 2,
    special_instruction: specialInstruction,
    item_quantity: itemQuantity,
    item_weight: String(itemWeightKg),
    item_description: itemDescription,
    amount_to_collect: Math.round(amountToCollect),
  };

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const response = await deps.fetch(`${normalizedBaseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (typeof body?.message === "string" && body.message) ||
      (typeof body?.error === "string" && body.error) ||
      "Pathao booking failed";
    throw new Error(message);
  }

  const result = safeObject((body as Record<string, unknown>).data ?? body);
  const consignmentId =
    readText(result.consignment_id, 120) ??
    readText(result.consignmentId, 120) ??
    readText(result.parcel_id, 120);
  const trackingNumber =
    readText(result.tracking_number, 120) ??
    readText(result.trackingNumber, 120) ??
    consignmentId ??
    readText(result.reference_no, 120);

  return {
    requestPayload: payload,
    responsePayload: body as Record<string, unknown>,
    consignmentId,
    trackingNumber,
  };
}
