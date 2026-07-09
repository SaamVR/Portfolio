/**
 * Generate a URL-friendly slug from a product name.
 * e.g. "Premium Cotton T-Shirt" → "premium-cotton-t-shirt"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Build a product URL with slug: /product/premium-cotton-t-shirt-<id>
 * The id is appended after a double-hyphen delimiter for unambiguous extraction.
 */
export function productUrl(id: string, name: string, storeSlug?: string | null): string {
  const slug = slugify(name);
  const basePath = storeSlug ? `/stores/${encodeURIComponent(storeSlug)}/product` : "/product";
  return `${basePath}/${slug}--${encodeURIComponent(id)}`;
}

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * Extract the product ID from a slug-id param.
 * Supports current double-hyphen URLs, UUID-only/UUID-suffix URLs,
 * and legacy launch-product URLs that used a single hyphen before the id.
 */
export function extractIdFromSlug(slugId: string): string {
  const decoded = decodeURIComponent(slugId);

  const delimiterIndex = decoded.lastIndexOf("--");
  if (delimiterIndex !== -1) {
    return decoded.slice(delimiterIndex + 2);
  }

  // UUID is 36 chars (8-4-4-4-12)
  if (decoded.length >= 36) {
    const possibleId = decoded.slice(-36);
    if (isUuid(possibleId)) {
      return possibleId;
    }
  }

  if (decoded.startsWith("launch-")) {
    return decoded;
  }

  const legacyLaunchIndex = decoded.lastIndexOf("-launch-");
  if (legacyLaunchIndex !== -1) {
    return decoded.slice(legacyLaunchIndex + 1);
  }

  // Fallback: return as-is (backwards compat for old bookmarked links)
  return decoded;
}
