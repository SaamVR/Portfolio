import { PRIVATE_NO_STORE_CACHE_CONTROL } from "@/lib/http/cache-control";
import { PUBLIC_STOREFRONT_CACHE_CONTROL } from "@/lib/http/public-cache";

export type StorefrontCacheMode = "public" | "private-preview";

export type StorefrontCachePolicy = {
  mode: StorefrontCacheMode;
  cacheControl: string;
  mayUseSharedCache: boolean;
};

export function normalizeStorefrontPreviewToken(value?: string | null) {
  return value?.trim() || null;
}

export function resolveStorefrontCachePolicy(previewToken?: string | null): StorefrontCachePolicy {
  if (normalizeStorefrontPreviewToken(previewToken)) {
    return {
      mode: "private-preview",
      cacheControl: PRIVATE_NO_STORE_CACHE_CONTROL,
      mayUseSharedCache: false,
    };
  }

  return {
    mode: "public",
    cacheControl: PUBLIC_STOREFRONT_CACHE_CONTROL,
    mayUseSharedCache: true,
  };
}
