import type { StorefrontBlockType, StorefrontTemplateId } from "@/lib/cms/storefront-templates";

export type StorefrontHeroExperience =
  | "builder"
  | "campaign"
  | "editorial"
  | "beauty"
  | "tech"
  | "food"
  | "artisan"
  | "subscription"
  | "digital"
  | "inquiry"
  | "service"
  | "catalog"
  | "booking"
  | "hotel"
  | "property";

export type StorefrontCategoryExperience =
  | "cards"
  | "editorial-grid"
  | "ritual-carousel"
  | "spec-list"
  | "menu-list"
  | "artisan-masonry"
  | "plan-list"
  | "digital-grid"
  | "inquiry-grid"
  | "service-list"
  | "catalog-grid"
  | "booking-list"
  | "room-carousel"
  | "property-grid";

export type StorefrontFeaturedExperience =
  | "catalog"
  | "editorial"
  | "beauty"
  | "tech"
  | "menu"
  | "artisan"
  | "plans"
  | "digital"
  | "spotlight"
  | "inquiry"
  | "service"
  | "booking"
  | "hotel"
  | "property";

export interface StorefrontExperienceProfile {
  hero: StorefrontHeroExperience;
  category: StorefrontCategoryExperience;
  featured: StorefrontFeaturedExperience;
  heroLayout: "full-bleed" | "split" | "centered" | "editorial";
  defaultLayouts: Partial<Record<StorefrontBlockType, string>>;
  decisionPriority: readonly StorefrontBlockType[];
}

const profiles: Record<StorefrontTemplateId, StorefrontExperienceProfile> = {
  blank: {
    hero: "builder",
    category: "cards",
    featured: "catalog",
    heroLayout: "split",
    defaultLayouts: { hero: "split", "category-showcase": "cards", "featured-products": "3-col" },
    decisionPriority: ["hero", "category-showcase", "featured-products"],
  },
  landing: {
    hero: "campaign",
    category: "cards",
    featured: "spotlight",
    heroLayout: "centered",
    defaultLayouts: { hero: "centered", "rich-text": "brand-story", testimonials: "spotlight" },
    decisionPriority: ["hero", "rich-text", "trust-badges", "testimonials", "faq-accordion"],
  },
  beauty: {
    hero: "beauty",
    category: "ritual-carousel",
    featured: "beauty",
    heroLayout: "split",
    defaultLayouts: { hero: "split", "category-showcase": "carousel", "featured-products": "3-col", "social-feed": "before-after" },
    decisionPriority: ["hero", "category-showcase", "featured-products", "trust-badges", "testimonials"],
  },
  fashion: {
    hero: "editorial",
    category: "editorial-grid",
    featured: "editorial",
    heroLayout: "editorial",
    defaultLayouts: { hero: "editorial", "category-showcase": "masonry", "featured-products": "4-col" },
    decisionPriority: ["hero", "category-showcase", "featured-products", "social-feed", "recently-viewed"],
  },
  electronics: {
    hero: "tech",
    category: "spec-list",
    featured: "tech",
    heroLayout: "split",
    defaultLayouts: { hero: "split", "category-showcase": "compact-list", "featured-products": "4-col", comparison: "tech-spec" },
    decisionPriority: ["hero", "featured-products", "comparison", "category-showcase", "faq-accordion"],
  },
  food: {
    hero: "food",
    category: "menu-list",
    featured: "menu",
    heroLayout: "full-bleed",
    defaultLayouts: { hero: "full-bleed", "category-showcase": "compact-list", "featured-products": "2-col" },
    decisionPriority: ["hero", "category-showcase", "featured-products", "promo-banner", "trust-badges"],
  },
  crafts: {
    hero: "artisan",
    category: "artisan-masonry",
    featured: "artisan",
    heroLayout: "editorial",
    defaultLayouts: { hero: "editorial", "category-showcase": "masonry", "featured-products": "3-col", "rich-text": "brand-story" },
    decisionPriority: ["hero", "rich-text", "category-showcase", "featured-products", "testimonials"],
  },
  subscriptions: {
    hero: "subscription",
    category: "plan-list",
    featured: "plans",
    heroLayout: "centered",
    defaultLayouts: { hero: "centered", "category-showcase": "compact-list", "featured-products": "3-col", "trust-badges": "stats" },
    decisionPriority: ["hero", "featured-products", "comparison", "faq-accordion", "trust-badges"],
  },
  "digital-downloads": {
    hero: "digital",
    category: "digital-grid",
    featured: "digital",
    heroLayout: "split",
    defaultLayouts: { hero: "split", "category-showcase": "cards", "featured-products": "4-col" },
    decisionPriority: ["hero", "category-showcase", "featured-products", "faq-accordion", "recently-viewed"],
  },
  "single-product": {
    hero: "campaign",
    category: "cards",
    featured: "spotlight",
    heroLayout: "split",
    defaultLayouts: { hero: "split", "rich-text": "brand-story", testimonials: "spotlight" },
    decisionPriority: ["hero", "video-reel", "rich-text", "testimonials", "faq-accordion", "trust-badges"],
  },
  "inquiry-catalog": {
    hero: "inquiry",
    category: "inquiry-grid",
    featured: "inquiry",
    heroLayout: "split",
    defaultLayouts: { hero: "split", "category-showcase": "cards", "featured-products": "3-col-sidebar-left" },
    decisionPriority: ["hero", "category-showcase", "featured-products", "rich-text", "faq-accordion"],
  },
  service: {
    hero: "service",
    category: "service-list",
    featured: "service",
    heroLayout: "split",
    defaultLayouts: { hero: "split", "category-showcase": "compact-list", "featured-products": "3-col", "rich-text": "brand-story" },
    decisionPriority: ["hero", "category-showcase", "featured-products", "testimonials", "faq-accordion"],
  },
  "general-catalog": {
    hero: "catalog",
    category: "catalog-grid",
    featured: "catalog",
    heroLayout: "split",
    defaultLayouts: { hero: "split", "category-showcase": "cards", "featured-products": "4-col" },
    decisionPriority: ["hero", "category-showcase", "featured-products", "recommended-products", "recently-viewed"],
  },
  booking: {
    hero: "booking",
    category: "booking-list",
    featured: "booking",
    heroLayout: "full-bleed",
    defaultLayouts: { hero: "full-bleed", "category-showcase": "compact-list", "featured-products": "3-col" },
    decisionPriority: ["hero", "category-showcase", "featured-products", "testimonials", "faq-accordion"],
  },
  hotel: {
    hero: "hotel",
    category: "room-carousel",
    featured: "hotel",
    heroLayout: "full-bleed",
    defaultLayouts: { hero: "full-bleed", "category-showcase": "carousel", "featured-products": "3-col" },
    decisionPriority: ["hero", "category-showcase", "featured-products", "social-feed", "testimonials", "faq-accordion"],
  },
  "real-estate": {
    hero: "property",
    category: "property-grid",
    featured: "property",
    heroLayout: "full-bleed",
    defaultLayouts: { hero: "full-bleed", "category-showcase": "cards", "featured-products": "3-col-sidebar-left" },
    decisionPriority: ["hero", "category-showcase", "featured-products", "rich-text", "testimonials", "faq-accordion"],
  },
};

export function getStorefrontExperienceProfile(templateId: StorefrontTemplateId): StorefrontExperienceProfile {
  return profiles[templateId];
}

export function getTemplateDefaultBlockLayout(templateId: StorefrontTemplateId, blockType: StorefrontBlockType): string | undefined {
  return profiles[templateId].defaultLayouts[blockType];
}
