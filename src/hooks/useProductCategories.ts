import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalStore } from "@/components/storefront/store-context";

export function useProductCategories(explicitStoreId?: string | null) {
  const store = useOptionalStore();
  const storeId = explicitStoreId ?? store?.id ?? null;
  const hasScopedStore = store?.id === storeId;
  const scopedCategories = Array.isArray(store?.siteSettings?.categories_custom_data)
    ? store.siteSettings.categories_custom_data as Array<Record<string, unknown>>
    : [];

  return useQuery({
    queryKey: ["product_categories", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      if (hasScopedStore) {
        return scopedCategories.map((entry, index) => ({
          id: typeof entry.id === "string" ? entry.id : `scoped-category-${index}`,
          name: typeof entry.name === "string" ? entry.name : "",
          slug: typeof entry.slug === "string" ? entry.slug : null,
          description: typeof entry.description === "string" ? entry.description : null,
          image_url: typeof entry.image_url === "string" ? entry.image_url : null,
          sort_order: typeof entry.sort_order === "number" ? entry.sort_order : index,
          is_active: entry.is_active !== false,
        })).filter((entry) => entry.name.trim().length > 0);
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
