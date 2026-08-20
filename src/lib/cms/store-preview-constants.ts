export const STORE_PREVIEW_TOKEN_HEADER = "x-ezcomo-preview-token";
export const STORE_PREVIEW_SLUG_HEADER = "x-ezcomo-preview-store-slug";
export const STORE_PREVIEW_COOKIE_PREFIX = "ezcomo_store_preview_";
export const STORE_PREVIEW_TTL_SECONDS = 24 * 60 * 60;

export function getStorePreviewCookieName(storeSlug: string) {
  return `${STORE_PREVIEW_COOKIE_PREFIX}${storeSlug.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`;
}
