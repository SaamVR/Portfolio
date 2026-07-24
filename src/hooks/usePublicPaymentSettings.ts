import { useQuery } from "@tanstack/react-query";
import { useOptionalStore } from "@/components/storefront/store-context";

export interface PublicPaymentSettings {
  bkash_enabled: boolean;
  nagad_enabled: boolean;
  cod_enabled: boolean;
  bkash_number: string;
  nagad_number: string;
  prepaid_badge_text: string;
  prepayment_discount_type: "none" | "percentage" | "fixed" | "free_delivery";
  prepayment_discount_value: number;
  bkash_gateway_enabled: boolean;
}

export const defaultPaymentSettings: PublicPaymentSettings = {
  bkash_enabled: false,
  nagad_enabled: false,
  cod_enabled: true,
  bkash_number: "",
  nagad_number: "",
  prepaid_badge_text: "",
  prepayment_discount_type: "none",
  prepayment_discount_value: 0,
  bkash_gateway_enabled: false,
};

export function usePublicPaymentSettings(storeId?: string | null) {
  const currentStore = useOptionalStore();
  const scopedStoreSettings = currentStore?.siteSettings as Record<string, Partial<PublicPaymentSettings> | undefined> | undefined;
  const hasScopedValue = currentStore?.id === storeId && scopedStoreSettings && "payment_settings" in scopedStoreSettings;
  const scopedValue = hasScopedValue ? (scopedStoreSettings?.payment_settings ?? null) : null;

  return useQuery({
    queryKey: ["public_payment_settings", storeId],
    queryFn: async () => {
      if (!storeId) return defaultPaymentSettings;

       if (hasScopedValue) {
        return { ...defaultPaymentSettings, ...scopedValue };
      }

      try {
        const response = await fetch(`/api/store-payment-settings?storeId=${encodeURIComponent(storeId)}`);
        if (response.status === 400 || response.status === 404) {
          return defaultPaymentSettings;
        }

        if (!response.ok) throw new Error(`Payment settings request failed: ${response.status}`);

        const data = (await response.json()) as Partial<PublicPaymentSettings>;
        return { ...defaultPaymentSettings, ...data };
      } catch {
        return defaultPaymentSettings;
      }
    },
    enabled: !!storeId,
    staleTime: 120_000,
  });
}
