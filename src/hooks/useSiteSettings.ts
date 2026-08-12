import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalStore } from "@/components/storefront/store-context";

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function useSiteSettings<T = any>(key: string, explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const scopedStoreSettings = currentStore?.siteSettings as Record<string, T | undefined> | undefined;
  const hasScopedStore = currentStore?.id === storeId && !!scopedStoreSettings;
  const hasScopedValue = hasScopedStore && key in scopedStoreSettings;
  const scopedValue = hasScopedValue ? (scopedStoreSettings?.[key] ?? null) : null;

  return useQuery({
    queryKey: ["site_settings", storeId, key],
    queryFn: async () => {
      if (!storeId) return null;

      if (hasScopedValue) {
        return scopedValue as T | null;
      }

      // Public storefront pages already receive a store-scoped settings snapshot
      // through StoreProvider, so missing keys should resolve to null instead of
      // falling back to merchant-scoped direct reads that trigger permission noise.
      if (hasScopedStore) {
        return null;
      }

      if (!isValidUUID(storeId)) {
        return null;
      }

      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", key)
          .eq("store_id" as any, storeId)
          .maybeSingle();
        if (error) throw error;
        return (data?.value ?? null) as T | null;
      } catch (err) {
        console.warn(`Failed to fetch site setting for ${key}:`, err);
        return null;
      }
    },
    staleTime: 120_000,
    enabled: !!storeId,
  });
}
