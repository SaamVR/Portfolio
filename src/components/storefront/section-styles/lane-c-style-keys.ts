export const FEATURED_PRODUCT_SECTION_RENDERER_KEYS = {
  "editorial-grid": "featured-products/editorial-grid",
  "center-focus-rail": "featured-products/center-focus-rail",
  "compact-commerce-grid": "featured-products/compact-commerce-grid",
  "product-spotlight": "featured-products/product-spotlight",
  "magazine-rail": "featured-products/magazine-rail",
  "dense-catalog": "featured-products/dense-catalog",
} as const;

export const PROMO_SECTION_RENDERER_KEYS = {
  "image-campaign-banner": "promo-banner/image-campaign-banner",
  "dual-promo": "promo-banner/dual-promo",
  "campaign-cta": "promo-banner/campaign-cta",
} as const;

export const STORY_SECTION_RENDERER_KEYS = {
  "split-brand-story": "rich-text/split-brand-story",
  "editorial-quote": "rich-text/editorial-quote",
  "minimal-story": "rich-text/minimal-story",
} as const;
export type FeaturedProductSectionStyle = keyof typeof FEATURED_PRODUCT_SECTION_RENDERER_KEYS;
export type PromoSectionStyle = keyof typeof PROMO_SECTION_RENDERER_KEYS;
export type StorySectionStyle = keyof typeof STORY_SECTION_RENDERER_KEYS;

function resolveKey<T extends Record<string, string>>(map: T, variant: string | null | undefined): keyof T | null {
  if (!variant || !(variant in map)) return null;
  return variant as keyof T;
}

export function resolveFeaturedProductSectionStyle(variant: string | null | undefined): FeaturedProductSectionStyle | null {
  if (variant === "carousel") return "center-focus-rail";
  return resolveKey(FEATURED_PRODUCT_SECTION_RENDERER_KEYS, variant);
}

export function resolvePromoSectionStyle(variant: string | null | undefined): PromoSectionStyle | null {
  return resolveKey(PROMO_SECTION_RENDERER_KEYS, variant);
}

export function resolveStorySectionStyle(variant: string | null | undefined): StorySectionStyle | null {
  return resolveKey(STORY_SECTION_RENDERER_KEYS, variant);
}
