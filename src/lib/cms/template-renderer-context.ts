import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";

const specializedTemplateConsumedBlocks: Partial<Record<StorefrontTemplateId, StorePageBlock["type"][]>> = {
  beauty: ["hero", "trust-badges", "category-showcase", "featured-products", "testimonials"],
  booking: ["hero", "category-showcase", "featured-products", "rich-text", "testimonials"],
  crafts: ["hero", "category-showcase", "featured-products"],
  "digital-downloads": ["hero", "category-showcase", "featured-products", "rich-text", "testimonials", "trust-badges"],
  electronics: ["hero", "category-showcase", "featured-products", "countdown", "comparison"],
  food: ["hero", "category-showcase", "featured-products", "countdown"],
  "general-catalog": ["hero", "category-showcase", "featured-products"],
  hotel: ["hero", "category-showcase", "featured-products", "rich-text", "testimonials"],
  "inquiry-catalog": ["hero", "category-showcase", "featured-products", "trust-badges", "rich-text"],
  landing: ["hero", "category-showcase", "featured-products", "rich-text", "social-feed", "testimonials", "faq-accordion", "trust-badges"],
  "real-estate": ["hero", "category-showcase", "featured-products", "rich-text", "testimonials"],
  service: ["hero", "promo-banner", "category-showcase", "featured-products", "rich-text", "social-feed", "testimonials", "faq-accordion", "trust-badges"],
  "single-product": ["hero", "trust-badges", "countdown", "featured-products", "testimonials"],
  subscriptions: ["hero", "category-showcase", "featured-products", "rich-text", "testimonials", "trust-badges"],
};

export function getSpecializedTemplateConsumedBlocks(templateId: StorefrontTemplateId) {
  return specializedTemplateConsumedBlocks[templateId] ?? [];
}
