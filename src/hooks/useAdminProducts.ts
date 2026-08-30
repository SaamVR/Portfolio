import { useInfiniteQuery, useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  buildAdminCollectionPage,
  getAdminCollectionRange,
  normalizeAdminCollectionSearch,
} from "@/lib/admin/admin-collection-pagination";

export type AdminProductRecord = Tables<"products"> & {
  metric_values?: unknown;
};

export type AdminProductListItem = Pick<
  AdminProductRecord,
  | "id"
  | "name"
  | "price"
  | "image_url"
  | "type"
  | "category"
  | "stock"
  | "is_available"
  | "featured"
  | "badge"
  | "created_at"
>;

export type AdminProductStats = {
  catalogSize: number;
  readyToSell: number;
  featured: number;
  outOfStock: number;
};

export const ADMIN_PRODUCT_LIST_COLUMNS =
  "id,name,price,image_url,type,category,stock,is_available,featured,badge,created_at" as const;

export const adminProductPagesKey = (storeId?: string | null) => ["admin-products-pages", storeId] as const;
export const adminProductStatsKey = (storeId?: string | null) => ["admin-products-stats", storeId] as const;

export async function fetchAdminProductPage(storeId: string, search: string, page: number) {
  const normalizedSearch = normalizeAdminCollectionSearch(search);
  const range = getAdminCollectionRange(page);
  let query = supabase
    .from("products")
    .select(ADMIN_PRODUCT_LIST_COLUMNS)
    .eq("store_id", storeId);

  if (normalizedSearch) {
    query = query.ilike("name", `%${normalizedSearch}%`);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(range.from, range.to);

  if (error) throw error;
  return buildAdminCollectionPage((data ?? []) as unknown as AdminProductListItem[], range.page, range.pageSize);
}

export function useAdminProductPages(storeId: string | null | undefined, search: string) {
  const normalizedSearch = normalizeAdminCollectionSearch(search);
  return useInfiniteQuery({
    queryKey: [...adminProductPagesKey(storeId), normalizedSearch],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchAdminProductPage(storeId as string, normalizedSearch, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: Boolean(storeId),
    staleTime: 15_000,
  });
}

export async function fetchAdminProductStats(storeId: string): Promise<AdminProductStats> {
  const [catalog, ready, featured, outOfStock] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeId),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gt("stock", 0)
      .or("is_available.eq.true,is_available.is.null"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("featured", true),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .lte("stock", 0),
  ]);

  const error = catalog.error || ready.error || featured.error || outOfStock.error;
  if (error) throw error;

  return {
    catalogSize: catalog.count ?? 0,
    readyToSell: ready.count ?? 0,
    featured: featured.count ?? 0,
    outOfStock: outOfStock.count ?? 0,
  };
}

export function useAdminProductStats(storeId: string | null | undefined) {
  return useQuery({
    queryKey: adminProductStatsKey(storeId),
    queryFn: () => fetchAdminProductStats(storeId as string),
    enabled: Boolean(storeId),
    staleTime: 15_000,
  });
}

export async function fetchAdminProductDetail(storeId: string, productId: string): Promise<AdminProductRecord> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Product not found");
  return data as unknown as AdminProductRecord;
}

export async function fetchAllAdminProductsForExport(storeId: string): Promise<AdminProductRecord[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as AdminProductRecord[];
}

export async function invalidateAdminProductCollections(queryClient: QueryClient, storeId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: adminProductPagesKey(storeId) }),
    queryClient.invalidateQueries({ queryKey: adminProductStatsKey(storeId) }),
  ]);
}
