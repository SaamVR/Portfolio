import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useOptionalStore } from "@/components/storefront/store-context";
import type { StorefrontThemeCustomization } from "@/lib/storefront-theme-customization";

export function useStorefrontThemeCustomization(explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  return useSiteSettings<StorefrontThemeCustomization>("theme_customization", explicitStoreId ?? currentStore?.id);
}
