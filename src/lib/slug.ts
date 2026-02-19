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
 * The id is appended at the end after the last hyphen for extraction.
 */
export function productUrl(id: string, name: string): string {
  const slug = slugify(name);
  return `/product/${slug}-${id}`;
}

/**
 * Extract the product ID from a slug-id param.
 * The ID is a UUID, so we extract the last 36 characters.
 */
export function extractIdFromSlug(slugId: string): string {
  // UUID is 36 chars (8-4-4-4-12)
  if (slugId.length >= 36) {
    const possibleId = slugId.slice(-36);
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(possibleId)) {
      return possibleId;
    }
  }
  // Fallback: return as-is (backwards compat for old bookmarked links)
  return slugId;
}
