import { isUuid } from "@/lib/slug";

// Keep this lightweight client-side sentinel aligned with DEFAULT_STORE_ID in
// default-store.ts. The regression test guards against the two values drifting.
export const LOCAL_PREVIEW_STORE_ID = "00000000-0000-4000-8000-000000000001";

export type StorefrontCatalogSource = "preview-seed" | "storefront-api" | "database";

export function isPreviewCatalogStore(storeId?: string | null) {
  const normalizedStoreId = storeId?.trim();
  if (!normalizedStoreId) return false;

  return normalizedStoreId === LOCAL_PREVIEW_STORE_ID || normalizedStoreId.startsWith("preview-");
}

export function resolveStorefrontCatalogSource(
  storeId?: string | null,
  currentStoreId?: string | null,
): StorefrontCatalogSource {
  if (isPreviewCatalogStore(storeId)) {
    return "preview-seed";
  }

  if (storeId && currentStoreId === storeId && isUuid(storeId)) {
    return "storefront-api";
  }

  return "database";
}
