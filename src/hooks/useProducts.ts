import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveImageUrl } from "@/lib/imageMap";
import type { Product } from "@/data/products";

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

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as DBProduct[]).map(mapDBProduct);
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapDBProduct(data as unknown as DBProduct) : null;
    },
    enabled: !!id,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("featured", true)
        .eq("is_available", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as DBProduct[]).map(mapDBProduct);
    },
    staleTime: 1000 * 60 * 2,
  });
}
