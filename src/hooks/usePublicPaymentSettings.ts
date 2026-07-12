import { useQuery } from "@tanstack/react-query";

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

const defaultPaymentSettings: PublicPaymentSettings = {
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
  return useQuery({
    queryKey: ["public_payment_settings", storeId],
    queryFn: async () => {
      if (!storeId) return defaultPaymentSettings;

      try {
        const response = await fetch(`/api/store-payment-settings?storeId=${encodeURIComponent(storeId)}`);
        if (!response.ok) throw new Error(`Payment settings request failed: ${response.status}`);

        const data = (await response.json()) as Partial<PublicPaymentSettings>;
        return { ...defaultPaymentSettings, ...data };
      } catch (error) {
        console.warn("Failed to fetch public payment settings:", error);
        return defaultPaymentSettings;
      }
    },
    enabled: !!storeId,
    staleTime: 120_000,
  });
}
