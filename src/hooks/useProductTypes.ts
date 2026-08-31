import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalStore } from "@/components/storefront/store-context";
import { readStorefrontTaxonomySnapshot } from "@/lib/storefront-taxonomy-snapshot";

export function useProductTypes(explicitStoreId?: string | null) {
  const store = useOptionalStore();
  const storeId = explicitStoreId ?? store?.id ?? null;
  const hasScopedStore = store?.id === storeId;
  const scopedTypes = readStorefrontTaxonomySnapshot(store?.siteSettings).types;

  return useQuery({
    queryKey: ["product_types", storeId, hasScopedStore ? "storefront-snapshot" : "database"],
    queryFn: async () => {
      if (!storeId) return [];
      if (hasScopedStore) {
        return scopedTypes;
      }
      const { data, error } = await supabase
        .from("product_types")
        .select("*")
        .eq("store_id", storeId as string)
        .order("sort_order");

      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(storeId),
  });
}
