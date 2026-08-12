import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalStore } from "@/components/storefront/store-context";


export function useProductTypes(explicitStoreId?: string | null) {
  const store = useOptionalStore();
  const storeId = explicitStoreId ?? store?.id ?? null;
  const hasScopedStore = store?.id === storeId;

  return useQuery({
    queryKey: ["product_types", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      if (hasScopedStore) {
        return [];
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
