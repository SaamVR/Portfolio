import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalStore } from "@/components/storefront/store-context";
import { readStorefrontTaxonomySnapshot } from "@/lib/storefront-taxonomy-snapshot";

export function useProductCategories(explicitStoreId?: string | null) {
  const store = useOptionalStore();
  const storeId = explicitStoreId ?? store?.id ?? null;
  const hasScopedStore = store?.id === storeId;
  const scopedCategories = readStorefrontTaxonomySnapshot(store?.siteSettings).categories;

  return useQuery({
    queryKey: ["product_categories", storeId, hasScopedStore ? "storefront-snapshot" : "database"],
    queryFn: async () => {
      if (!storeId) return [];
      if (hasScopedStore) {
        return scopedCategories.map((entry) => ({
          ...entry,
          slug: null,
          description: null,
          image_url: null,
          is_active: true,
        }));
      }
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("store_id", storeId as string)
        .order("sort_order");

      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(storeId),
  });
}
