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

export function createStoreSlug(name: string) {
  return slugify(name || "my-store") || "my-store";
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

export function storePageUrl(storeSlug: string, pageSlug: string): string {
  const normalizedSlug = pageSlug.replace(/^\/+/, "");
  return normalizedSlug ? `/stores/${encodeURIComponent(storeSlug)}/${normalizedSlug}` : `/stores/${encodeURIComponent(storeSlug)}`;
}

export function storefrontPath(path: string, storeSlug?: string | null): string {
  if (!storeSlug) {
    return path;
  }

  const [pathnamePart, queryPart] = path.split("?");
  const pathname = pathnamePart.startsWith("/") ? pathnamePart : `/${pathnamePart}`;
  const query = queryPart ? `?${queryPart}` : "";
  const encodedStoreSlug = encodeURIComponent(storeSlug);

  if (pathname === "/") {
    return `/stores/${encodedStoreSlug}`;
  }

  if (pathname === "/shop") {
    return `/stores/${encodedStoreSlug}/shop${query}`;
  }

  if (pathname.startsWith("/product/")) {
    return `/stores/${encodedStoreSlug}${pathname}${query}`;
  }

  if (pathname === "/checkout") {
    return `/stores/${encodedStoreSlug}/checkout${query}`;
  }

  if (pathname === "/order-success") {
    return `/stores/${encodedStoreSlug}/order-success${query}`;
  }

  if (pathname === "/contact") {
    return `/stores/${encodedStoreSlug}/contact${query}`;
  }

  if (pathname === "/cart") {
    return `/stores/${encodedStoreSlug}/cart${query}`;
  }

  if (pathname === "/wishlist") {
    return `/stores/${encodedStoreSlug}/wishlist${query}`;
  }

  if (pathname === "/account") {
    return `/stores/${encodedStoreSlug}/account${query}`;
  }

  if (pathname === "/track-order") {
    return `/stores/${encodedStoreSlug}/track-order${query}`;
  }

  return path;
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
