import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalStore } from "@/components/storefront/store-context";

export function useProductCategories(explicitStoreId?: string | null) {
  const store = useOptionalStore();
  const storeId = explicitStoreId ?? store?.id ?? null;

  return useQuery({
    queryKey: ["product_categories", storeId],
    queryFn: async () => {
      if (!storeId) return [];
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
