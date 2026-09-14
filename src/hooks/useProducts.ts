import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveImageUrl } from "@/lib/imageMap";
import { launchProducts, type Product } from "@/data/products";
import { isUuid } from "@/lib/slug";
import { useOptionalStore } from "@/components/storefront/store-context";
import { buildTemplateCatalogSeedRows } from "@/lib/cms/template-demo-seeds";
import { normalizeMetricDefinitions, normalizeMetricValues } from "@/lib/cms/product-metrics";
import { resolveStorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { canUseIndexedStorefrontSearch } from "@/lib/storefront/storefront-product-search";
import { normalizeCommercialOptions, normalizeFulfillmentType } from "@/lib/commerce/product-commercial-options";
import { resolveStorefrontCatalogSource } from "@/lib/storefront/storefront-product-truth";

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
  metric_values?: unknown;
  type_metric_schema?: unknown;
  commercial_options?: unknown;
  fulfillment_type?: unknown;
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
    metricValues: normalizeMetricValues(p.metric_values),
    typeMetricSchema: normalizeMetricDefinitions(p.type_metric_schema),
    commercialOptions: normalizeCommercialOptions(p.commercial_options),
    fulfillmentType: normalizeFulfillmentType(p.fulfillment_type),
  };
}

type SeedRowProduct = {
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
  metric_values?: unknown;
  type_metric_schema?: unknown;
  commercial_options?: unknown;
  fulfillment_type?: unknown;
};

function mapSeedRowProduct(product: SeedRowProduct): Product {
  const mainImage = resolveImageUrl(product.image_url);
  const extraImages = (product.images || []).map(resolveImageUrl).filter(Boolean);
  const allImages = [mainImage, ...extraImages.filter((img) => img !== mainImage)];

  return {
    id: product.id,
    name: product.name,
    price: product.price,
    originalPrice: product.original_price ?? undefined,
    image: mainImage,
    images: allImages,
    description: product.description,
    sizes: product.sizes,
    colors: product.colors,
    category: product.category,
    type: product.type,
    featured: product.featured,
    badge: product.badge ?? undefined,
    stock: product.stock,
    isAvailable: product.is_available,
    metricValues: normalizeMetricValues(product.metric_values),
    typeMetricSchema: normalizeMetricDefinitions(product.type_metric_schema),
    commercialOptions: normalizeCommercialOptions(product.commercial_options),
    fulfillmentType: normalizeFulfillmentType(product.fulfillment_type),
  };
}

function buildGenericLaunchProducts(): Product[] {
  return launchProducts.map((product) => ({
    ...product,
    image: resolveImageUrl(product.image),
    images: product.images.map(resolveImageUrl).filter(Boolean),
  }));
}

function buildFallbackProducts(storeId: string | null | undefined, currentStore?: { id?: string; siteSettings?: Record<string, unknown> | null } | null): Product[] {
  const storefrontProfile = typeof currentStore?.siteSettings?.storefront_profile === "object" && currentStore?.siteSettings?.storefront_profile
    ? currentStore.siteSettings.storefront_profile as Record<string, unknown>
    : null;

  const templateId = resolveStorefrontTemplateId(storefrontProfile?.template_id, {
    templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
    productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
  });

  const seededRows = buildTemplateCatalogSeedRows(storeId ?? currentStore?.id ?? "preview-seed-store", templateId).productRows as SeedRowProduct[];
  if (seededRows.length > 0) {
    return seededRows.map(mapSeedRowProduct);
  }

  return buildGenericLaunchProducts();
}

export function useProducts(explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const catalogSource = resolveStorefrontCatalogSource(storeId, currentStore?.id);

  return useQuery({
    queryKey: ["products", storeId],
    queryFn: async () => {
      if (catalogSource === "preview-seed") {
        return buildFallbackProducts(storeId, currentStore);
      }

      if (catalogSource === "storefront-api" && storeId) {
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
      return (data as unknown as DBProduct[]).map(mapDBProduct);
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!storeId,
  });
}

type ProductSearchOptions = {
  query: string;
  category?: string | null;
  type?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  saleOnly?: boolean;
  perPage?: number;
};

export function useProductSearch(options: ProductSearchOptions, explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const query = options.query.trim();
  const catalogSource = resolveStorefrontCatalogSource(storeId, currentStore?.id);
  const shouldUseIndexedSearch = catalogSource !== "preview-seed" && canUseIndexedStorefrontSearch(storeId, query) && isUuid(storeId ?? "");

  return useQuery({
    queryKey: [
      "product-search",
      storeId,
      query,
      options.category ?? "",
      options.type ?? "",
      options.minPrice ?? "",
      options.maxPrice ?? "",
      options.saleOnly ? "sale" : "all",
      options.perPage ?? 48,
    ],
    queryFn: async () => {
      if (!shouldUseIndexedSearch || !storeId || !query) {
        return null;
      }

      const url = new URL("/api/storefront/products/search", window.location.origin);
      url.searchParams.set("storeId", storeId);
      url.searchParams.set("q", query);
      if (options.category) url.searchParams.set("category", options.category);
      if (options.type) url.searchParams.set("type", options.type);
      if (options.minPrice) url.searchParams.set("min", options.minPrice);
      if (options.maxPrice) url.searchParams.set("max", options.maxPrice);
      if (options.saleOnly) url.searchParams.set("sale", "1");
      if (options.perPage) url.searchParams.set("perPage", String(options.perPage));

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Storefront product search request failed: ${response.status}`);
      }

      const data = (await response.json()) as DBProduct[];
      return data.map(mapDBProduct);
    },
    staleTime: 1000 * 30,
    enabled: !!storeId && !!query,
  });
}

export function useProduct(id: string | undefined, explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const catalogSource = resolveStorefrontCatalogSource(storeId, currentStore?.id);

  return useQuery({
    queryKey: ["product", storeId, id],
    queryFn: async () => {
      if (!id) return null;

      if (catalogSource === "preview-seed") {
        return buildFallbackProducts(storeId, currentStore).find((product) => product.id === id) ?? null;
      }

      if (!isUuid(id)) {
        return null;
      }

      if (catalogSource === "storefront-api" && storeId) {
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
    },
    enabled: !!id && !!storeId,
  });
}

export function useProductsByIds(ids: string[], explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const catalogSource = resolveStorefrontCatalogSource(storeId, currentStore?.id);

  return useQuery({
    queryKey: ["products", storeId, "by-ids", ids.join(",")],
    queryFn: async () => {
      if (!ids.length) return [];

      if (catalogSource === "preview-seed") {
        return buildFallbackProducts(storeId, currentStore).filter((product) => ids.includes(product.id));
      }

      const dbIds = ids.filter(isUuid);
      if (!dbIds.length) {
        return [];
      }

      if (catalogSource === "storefront-api" && storeId) {
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
      return (data as unknown as DBProduct[]).map(mapDBProduct);
    },
    enabled: ids.length > 0 && !!storeId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useFeaturedProducts(explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const catalogSource = resolveStorefrontCatalogSource(storeId, currentStore?.id);

  return useQuery({
    queryKey: ["products", storeId, "featured"],
    queryFn: async () => {
      if (catalogSource === "preview-seed") {
        return buildFallbackProducts(storeId, currentStore).filter((product) => product.featured);
      }

      if (catalogSource === "storefront-api" && storeId) {
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
      return (data as unknown as DBProduct[]).map(mapDBProduct);
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!storeId,
  });
}
