import { genericCourierApiFields } from "@/lib/couriers/provider-fields";
import {
  buildSharedCourierPublicSettings,
  buildSharedCourierSummary,
  hasRequiredCourierOperations,
  pickCourierSecret,
  readCourierText,
  safeCourierProviderObject,
  type CourierProviderPlugin,
} from "@/lib/couriers/provider-plugin";

export function createSetupOnlyCourierPlugin(id: string, label: string, description: string): CourierProviderPlugin {
  return {
    manifest: {
      id,
      category: "courier",
      label,
      description,
      runtimeStatus: "setup_only",
      bookingMode: "setup_only",
      defaultSupportsCod: true,
      defaultSupportsCityDelivery: true,
      capabilities: ["credential_storage", "operator_handoff"],
      fields: genericCourierApiFields,
      guide: {
        title: `${label} setup guidance`,
        body: `Store ${label} merchant and fulfillment details here now. Automated booking remains disabled until a reviewed ${label} adapter is installed.`,
      },
    },
    adapter: {
      splitSettings(rawSettings) {
        const settings = safeCourierProviderObject(rawSettings);
        const accessToken = pickCourierSecret(settings.accessToken);
        const apiKey = pickCourierSecret(settings.apiKey);
        const secretKey = pickCourierSecret(settings.secretKey);
        return {
          publicSettings: {
            ...buildSharedCourierPublicSettings(rawSettings),
            base_url: readCourierText(settings.baseUrl, 300),
            external_merchant_code: readCourierText(settings.externalMerchantCode, 120),
          },
          secretSettings: {
            ...(accessToken ? { access_token: accessToken } : {}),
            ...(apiKey ? { api_key: apiKey } : {}),
            ...(secretKey ? { secret_key: secretKey } : {}),
          },
        };
      },
      summarizeSettings(publicSettings, secretSettings) {
        const settings = safeCourierProviderObject(publicSettings);
        const secrets = safeCourierProviderObject(secretSettings);
        return {
          ...buildSharedCourierSummary(publicSettings),
          baseUrl: typeof settings.base_url === "string" ? settings.base_url : null,
          externalMerchantCode: typeof settings.external_merchant_code === "string" ? settings.external_merchant_code : null,
          hasAccessToken: Boolean(readCourierText(secrets.access_token, 500)),
          hasApiKey: Boolean(readCourierText(secrets.api_key, 500)),
          hasSecretKey: Boolean(readCourierText(secrets.secret_key, 500)),
        };
      },
      isConfigurationComplete(publicSettings) {
        return hasRequiredCourierOperations(publicSettings);
      },
    },
  };
}
