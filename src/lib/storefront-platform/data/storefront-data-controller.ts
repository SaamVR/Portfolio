export type StorefrontStoreLookup = {
  storeId?: string | null;
  slug?: string | null;
  requestedPageSlug?: string | null;
  previewToken?: string | null;
  shellOnly?: boolean;
};

export type StorefrontProductsLookup = {
  storeId: string;
  featuredOnly?: boolean;
  ids?: string[];
  productId?: string | null;
  previewToken?: string | null;
};

export type StorefrontSearchLookup = {
  storeId: string;
  query: string;
  category?: string | null;
  type?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  saleOnly?: boolean;
  perPage?: number;
  previewToken?: string | null;
};

export type StorefrontDataControllerDependencies = {
  loadStore: (args: StorefrontStoreLookup) => Promise<unknown>;
  loadProducts: (args: StorefrontProductsLookup) => Promise<unknown>;
  searchProducts: (args: StorefrontSearchLookup) => Promise<unknown>;
};

function normalize(value?: string | null) {
  return value?.trim() ?? "";
}

function stableNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

export function buildStorefrontDataRequestKey(
  kind: "store" | "products" | "search",
  args: StorefrontStoreLookup | StorefrontProductsLookup | StorefrontSearchLookup,
) {
  if (kind === "store") {
    const value = args as StorefrontStoreLookup;
    return [kind, normalize(value.storeId), normalize(value.slug), normalize(value.requestedPageSlug),
      normalize(value.previewToken), value.shellOnly ? "shell" : "full"].join("|");
  }

  if (kind === "products") {
    const value = args as StorefrontProductsLookup;
    return [kind, normalize(value.storeId), value.featuredOnly ? "featured" : "all",
      normalize(value.productId), [...(value.ids ?? [])].map(normalize).filter(Boolean).sort().join(","),
      normalize(value.previewToken)].join("|");
  }

  const value = args as StorefrontSearchLookup;
  return [kind, normalize(value.storeId), normalize(value.query), normalize(value.category), normalize(value.type),
    stableNumber(value.minPrice), stableNumber(value.maxPrice), value.saleOnly ? "sale" : "all",
    stableNumber(value.perPage), normalize(value.previewToken)].join("|");
}

export function createStorefrontDataController(deps: StorefrontDataControllerDependencies) {
  const inFlight = new Map<string, Promise<unknown>>();

  const once = <T>(key: string, load: () => Promise<T>): Promise<T> => {
    const existing = inFlight.get(key);
    if (existing) return existing as Promise<T>;

    const pending = load().catch((error) => {
      inFlight.delete(key);
      throw error;
    });
    inFlight.set(key, pending);
    return pending;
  };

  return {
    loadStore: (args: StorefrontStoreLookup) =>
      once(buildStorefrontDataRequestKey("store", args), () => deps.loadStore(args)),
    loadProducts: (args: StorefrontProductsLookup) =>
      once(buildStorefrontDataRequestKey("products", args), () => deps.loadProducts(args)),
    searchProducts: (args: StorefrontSearchLookup) =>
      once(buildStorefrontDataRequestKey("search", args), () => deps.searchProducts(args)),
    clear: () => inFlight.clear(),
    size: () => inFlight.size,
  };
}
