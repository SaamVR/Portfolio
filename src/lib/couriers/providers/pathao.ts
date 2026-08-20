import { createPathaoBooking } from "@/lib/couriers/server";
import { sharedCourierOperationsFields } from "@/lib/couriers/provider-fields";
import {
  buildSharedCourierPublicSettings,
  buildSharedCourierSummary,
  pickCourierSecret,
  readCourierPositiveNumber,
  readCourierText,
  safeCourierProviderObject,
  type CourierProviderPlugin,
} from "@/lib/couriers/provider-plugin";

export const pathaoCourierPlugin: CourierProviderPlugin = {
  manifest: {
    id: "pathao",
    category: "courier",
    label: "Pathao",
    description: "Pathao merchant API booking for Bangladesh delivery and COD operations.",
    runtimeStatus: "active",
    bookingMode: "api",
    defaultSupportsCod: true,
    defaultSupportsCityDelivery: true,
    capabilities: ["booking", "cod", "city_delivery", "returns_operations"],
    fields: [
      ...sharedCourierOperationsFields,
      { key: "sandboxMode", label: "Sandbox mode", kind: "boolean", scope: "public", defaultValue: false },
      { key: "baseUrl", label: "API base URL", kind: "url", scope: "public", required: true, placeholder: "https://merchant.pathao.com/aladdin/api/v1" },
      { key: "merchantStoreId", label: "Merchant store ID", kind: "number", scope: "public", required: true },
      { key: "merchantOrderPrefix", label: "Merchant order prefix", kind: "text", scope: "public" },
      { key: "deliveryType", label: "Delivery type", kind: "number", scope: "public", defaultValue: 48 },
      { key: "itemType", label: "Item type", kind: "number", scope: "public", defaultValue: 2 },
      { key: "specialInstruction", label: "Special instruction", kind: "text", scope: "public" },
      { key: "accessToken", label: "Access token", kind: "password", scope: "secret", required: true },
    ],
    guide: {
      title: "Pathao setup guidance",
      body: "Use the merchant API base URL, exact merchant store ID and a valid access token. Keep pickup/return responsibility explicit for COD operations.",
      examples: ["Merchant order prefix: ECM", "Special instruction: Call before pickup"],
    },
  },
  adapter: {
    splitSettings(rawSettings) {
      const settings = safeCourierProviderObject(rawSettings);
      const accessToken = pickCourierSecret(settings.accessToken);
      return {
        publicSettings: {
          ...buildSharedCourierPublicSettings(rawSettings),
          base_url: readCourierText(settings.baseUrl, 300),
          merchant_store_id: readCourierPositiveNumber(settings.merchantStoreId, null),
          merchant_order_prefix: readCourierText(settings.merchantOrderPrefix, 40),
          delivery_type: readCourierPositiveNumber(settings.deliveryType, 48),
          item_type: readCourierPositiveNumber(settings.itemType, 2),
          special_instruction: readCourierText(settings.specialInstruction, 300),
        },
        secretSettings: accessToken ? { access_token: accessToken } : {},
      };
    },
    summarizeSettings(publicSettings, secretSettings) {
      const settings = safeCourierProviderObject(publicSettings);
      const secrets = safeCourierProviderObject(secretSettings);
      return {
        ...buildSharedCourierSummary(publicSettings),
        baseUrl: typeof settings.base_url === "string" ? settings.base_url : null,
        merchantStoreId: readCourierPositiveNumber(settings.merchant_store_id, null),
        merchantOrderPrefix: typeof settings.merchant_order_prefix === "string" ? settings.merchant_order_prefix : null,
        deliveryType: readCourierPositiveNumber(settings.delivery_type, null),
        itemType: readCourierPositiveNumber(settings.item_type, null),
        specialInstruction: typeof settings.special_instruction === "string" ? settings.special_instruction : null,
        hasAccessToken: Boolean(readCourierText(secrets.access_token, 500)),
      };
    },
    async book({ deps, order, connection, credential, booking }) {
      const result = await createPathaoBooking(
        { fetch: deps.fetch },
        order,
        connection,
        credential?.secret_payload ?? {},
        booking,
      );
      return {
        requestPayload: result.requestPayload as Record<string, unknown>,
        responsePayload: result.responsePayload,
        consignmentId: result.consignmentId ?? null,
        trackingNumber: result.trackingNumber ?? null,
      };
    },
  },
};
