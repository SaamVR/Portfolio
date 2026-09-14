import { useQuery } from "@tanstack/react-query";
import { resolveImageUrl } from "@/lib/imageMap";
import type { Product } from "@/data/products";
import { normalizeMetricDefinitions, normalizeMetricValues } from "@/lib/cms/product-metrics";
import { useOptionalStore } from "@/components/storefront/store-context";
import { isUuid } from "@/lib/slug";
import { canUseIndexedStorefrontSearch } from "@/lib/storefront/storefront-product-search";
import { normalizeCommercialOptions, normalizeFulfillmentType } from "@/lib/commerce/product-commercial-options";

type DBProduct = {
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

export type ProductSearchOptions = {
  query: string;
  category?: string | null;
  type?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  saleOnly?: boolean;
  perPage?: number;
};

function mapDBProduct(product: DBProduct): Product {
  const mainImage = resolveImageUrl(product.image_url);
  const extraImages = (product.images || []).map(resolveImageUrl).filter(Boolean);
  const allImages = [mainImage, ...extraImages.filter((image) => image !== mainImage)];

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
    type: product.type as Product["type"],
    featured: product.featured,
    badge: (product.badge as Product["badge"]) ?? undefined,
    stock: product.stock,
    isAvailable: product.is_available,
    metricValues: normalizeMetricValues(product.metric_values),
    typeMetricSchema: normalizeMetricDefinitions(product.type_metric_schema),
    commercialOptions: normalizeCommercialOptions(product.commercial_options),
    fulfillmentType: normalizeFulfillmentType(product.fulfillment_type),
  };
}

export function useProductSearch(options: ProductSearchOptions, explicitStoreId?: string | null) {
  const currentStore = useOptionalStore();
  const storeId = explicitStoreId ?? currentStore?.id;
  const query = options.query.trim();
  const shouldUseIndexedSearch = canUseIndexedStorefrontSearch(storeId, query) && isUuid(storeId ?? "");

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
