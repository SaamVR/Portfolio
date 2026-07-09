import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { defaultStore } from "@/lib/cms/default-store";
import { useOptionalStore } from "@/components/storefront/store-context";

export function useSiteSettings<T = any>(key: string, explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;

  return useQuery({
    queryKey: ["site_settings", storeId, key],
    queryFn: async () => {
      if (!storeId) return null;
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


