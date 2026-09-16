import { cache } from "react";
import { getStoreById, getStoreBySlug, getStoreShellById, getStoreShellBySlug } from "@/lib/cms/store-resolver";
import { getStorefrontProducts } from "@/lib/storefront/storefront-products";
import { searchStorefrontProducts } from "@/lib/storefront/storefront-product-search";
import { createStorefrontDataController } from "@/lib/storefront-platform/data/storefront-data-controller";

export const getRequestStorefrontDataController = cache(() => createStorefrontDataController({
  async loadStore(args) {
    const options = { requestedPageSlug: args.requestedPageSlug };
    if (args.storeId) {
      return args.shellOnly ? getStoreShellById(args.storeId, options) : getStoreById(args.storeId, options);
    }
    if (!args.slug) return null;
    return args.shellOnly
      ? getStoreShellBySlug(args.slug, args.previewToken, options)
      : getStoreBySlug(args.slug, args.previewToken, options);
  },
  loadProducts(args) {
    return getStorefrontProducts(args);
  },
  searchProducts(args) {
    return searchStorefrontProducts(args);
  },
}));
