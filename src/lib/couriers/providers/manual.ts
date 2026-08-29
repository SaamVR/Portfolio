import { buildManualShipmentPayload } from "@/lib/couriers/server";
import { sharedCourierOperationsFields } from "@/lib/couriers/provider-fields";
import {
  buildSharedCourierPublicSettings,
  buildSharedCourierSummary,
  hasRequiredCourierOperations,
  type CourierProviderPlugin,
} from "@/lib/couriers/provider-plugin";

export const manualCourierPlugin: CourierProviderPlugin = {
  manifest: {
    id: "manual",
    category: "courier",
    label: "Manual / Phone booking",
    description: "Record courier dispatches that are booked by phone, Facebook, or a provider panel.",
    runtimeStatus: "active",
    bookingMode: "manual",
    defaultSupportsCod: true,
    defaultSupportsCityDelivery: true,
    capabilities: ["booking", "cod", "city_delivery", "operator_handoff"],
    fields: sharedCourierOperationsFields,
    guide: {
      title: "Manual booking guidance",
      body: "Use this for providers without an API adapter yet. Assign pickup, return and COD responsibility clearly so orders do not get stuck.",
    },
  },
  adapter: {
    splitSettings(rawSettings) {
      return { publicSettings: buildSharedCourierPublicSettings(rawSettings), secretSettings: {} };
    },
    summarizeSettings(publicSettings) {
      return buildSharedCourierSummary(publicSettings);
    },
    isConfigurationComplete(publicSettings) {
      return hasRequiredCourierOperations(publicSettings);
    },
    async book({ deps, order, connection, booking }) {
      const payload = buildManualShipmentPayload(order, connection, booking);
      return {
        requestPayload: payload as Record<string, unknown>,
        responsePayload: {
          provider: "manual",
          booked_at: deps.now(),
          note: "Manual courier booking recorded by operator.",
        },
        consignmentId: null,
        trackingNumber: payload.merchantOrderId,
      };
    },
  },
};
