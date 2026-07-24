import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveImageUrl } from "@/lib/imageMap";
import type { Product } from "@/data/products";
import { isUuid } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";

interface DBProduct {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string;
  images: string[];
  description: string;
  sizes: string[];
  colors: string[];
  category: string;
  type: string;
  featured: boolean;
  badge: string | null;
  stock: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

function mapDBProduct(p: DBProduct): Product {
  const mainImage = resolveImageUrl(p.image_url);
  const extraImages = (p.images || []).map(resolveImageUrl).filter(Boolean);
  // Build gallery: main image first, then extras, deduplicated
  const allImages = [mainImage, ...extraImages.filter((img) => img !== mainImage)];

  return {
    id: p.id,
    name: p.name,
    price: p.price,
    originalPrice: p.original_price ?? undefined,
    image: mainImage,
    images: allImages,
    description: p.description,
    sizes: p.sizes,
    colors: p.colors,
    category: p.category,
    type: p.type as Product["type"],
    featured: p.featured,
    badge: (p.badge as Product["badge"]) ?? undefined,
    stock: p.stock,
    isAvailable: p.is_available,
  };
}

export function useProducts(explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const shouldUseStorefrontApi = currentStore?.id === storeId;

  return useQuery({
    queryKey: ["products", storeId],
    queryFn: async () => {
      try {
        if (shouldUseStorefrontApi && storeId) {
          const response = await fetch(`/api/storefront/products?storeId=${encodeURIComponent(storeId)}`);
          if (!response.ok) {
            throw new Error(`Storefront products request failed: ${response.status}`);
          }

          const data = (await response.json()) as DBProduct[];
          return data.map(mapDBProduct);
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("store_id", storeId as string)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const mapped = (data as unknown as DBProduct[]).map(mapDBProduct);
        return mapped;
      } catch (err) {
        console.warn("Failed to fetch products from Supabase, using mock products:", err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!storeId,
  });
}

export function useProduct(id: string | undefined, explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const shouldUseStorefrontApi = currentStore?.id === storeId;

  return useQuery({
    queryKey: ["product", storeId, id],
    queryFn: async () => {
      if (!id) return null;
      const fallback = null;
      if (!isUuid(id)) {
        return null;
      }
      try {
        if (shouldUseStorefrontApi && storeId) {
          const response = await fetch(`/api/storefront/products?storeId=${encodeURIComponent(storeId)}&id=${encodeURIComponent(id)}`);
          if (!response.ok) {
            throw new Error(`Storefront product request failed: ${response.status}`);
          }

          const data = (await response.json()) as DBProduct[];
          return data[0] ? mapDBProduct(data[0]) : null;
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .eq("store_id", storeId as string)
          .maybeSingle();
        if (error) throw error;
        return data ? mapDBProduct(data as unknown as DBProduct) : null;
      } catch (err) {
        console.warn(`Failed to fetch product ${id} from Supabase, using mock fallback:`, err);
        return null;
      }
    },
    enabled: !!id && !!storeId,
  });
}

export function useProductsByIds(ids: string[], explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const shouldUseStorefrontApi = currentStore?.id === storeId;

  return useQuery({
    queryKey: ["products", storeId, "by-ids", ids.join(",")],
    queryFn: async () => {
      if (!ids.length) return [];
      const dbIds = ids.filter(isUuid);
      const localIds = ids.filter((id) => !isUuid(id));
      const localProducts: any[] = [];
      if (!dbIds.length) return localProducts;
      try {
        if (shouldUseStorefrontApi && storeId) {
          const response = await fetch(`/api/storefront/products?storeId=${encodeURIComponent(storeId)}&ids=${encodeURIComponent(dbIds.join(","))}`);
          if (!response.ok) {
            throw new Error(`Storefront products-by-ids request failed: ${response.status}`);
          }

          const data = (await response.json()) as DBProduct[];
          return data.map(mapDBProduct);
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("store_id", storeId as string)
          .in("id", dbIds);
        if (error) throw error;
        const mapped = (data as unknown as DBProduct[]).map(mapDBProduct);
        const found = new Set(mapped.map((product) => product.id));
        const fallbacks: any[] = [];
        return [...mapped, ...fallbacks];
      } catch (err) {
        console.warn("Failed to fetch products by ids from Supabase, using mock products:", err);
        const fallbacks: any[] = [];
        return [...localProducts, ...fallbacks.filter(f => !localProducts.some(lp => lp.id === f.id))];
      }
    },
    enabled: ids.length > 0 && !!storeId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useFeaturedProducts(explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const shouldUseStorefrontApi = currentStore?.id === storeId;

  return useQuery({
    queryKey: ["products", storeId, "featured"],
    queryFn: async () => {
      try {
        if (shouldUseStorefrontApi && storeId) {
          const response = await fetch(`/api/storefront/products?storeId=${encodeURIComponent(storeId)}&featured=1`);
          if (!response.ok) {
            throw new Error(`Storefront featured products request failed: ${response.status}`);
          }

          const data = (await response.json()) as DBProduct[];
          return data.map(mapDBProduct);
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("store_id", storeId as string)
          .eq("featured", true)
          .eq("is_available", true)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const mapped = (data as unknown as DBProduct[]).map(mapDBProduct);
        return mapped;
      } catch (err) {
        console.warn("Failed to fetch featured products from Supabase, using mock products:", err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!storeId,
  });
}



