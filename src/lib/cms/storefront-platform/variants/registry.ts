import type { StoreBusinessFamily } from "@/lib/cms/storefront-template-seeds";
import type { StorePageBlock } from "@/lib/cms/schema";
import type {
  StorefrontResponsiveContract,
  StorefrontVariantDefinition,
} from "@/lib/cms/storefront-platform/variants/contracts";

const ALL_BUSINESS_FAMILIES: readonly StoreBusinessFamily[] = ["commerce", "booking", "listing", "service", "donation"];
const CATALOG_BUSINESS_FAMILIES: readonly StoreBusinessFamily[] = ["commerce", "listing"];

const MOBILE_STACK: StorefrontResponsiveContract = {
  mobile: { layout: "single-column", columns: 1, order: "source", overflow: "wrap" },
  tablet: { layout: "stack", columns: 1, order: "source", overflow: "wrap" },
  desktop: { layout: "preserve", order: "source", overflow: "clip" },
};

const MOBILE_CAROUSEL: StorefrontResponsiveContract = {
  mobile: { layout: "horizontal-scroll", columns: 1, order: "source", overflow: "scroll-x" },
  tablet: { layout: "horizontal-scroll", columns: 2, order: "source", overflow: "scroll-x" },
  desktop: { layout: "preserve", order: "source", overflow: "clip" },
};

const MOBILE_GRID: StorefrontResponsiveContract = {
  mobile: { layout: "grid", columns: 2, order: "source", overflow: "wrap" },
  tablet: { layout: "grid", columns: 3, order: "source", overflow: "wrap" },
  desktop: { layout: "preserve", order: "source", overflow: "wrap" },
};

const PRODUCT_GRID_LG: StorefrontResponsiveContract = {
  mobile: { layout: "grid", columns: 2, order: "source", overflow: "wrap" },
  tablet: { layout: "grid", columns: 2, order: "source", overflow: "wrap" },
  desktop: { layout: "preserve", order: "source", overflow: "wrap" },
};

const HERO_SPLIT_RESPONSIVE: StorefrontResponsiveContract = {
  mobile: { layout: "single-column", columns: 1, order: "content-first", overflow: "wrap" },
  tablet: { layout: "stack", columns: 1, order: "content-first", overflow: "wrap" },
  desktop: { layout: "two-column", columns: 2, order: "content-first", overflow: "clip" },
};

const MASONRY_RESPONSIVE: StorefrontResponsiveContract = {
  mobile: { layout: "grid", columns: 2, order: "source", overflow: "wrap" },
  tablet: { layout: "grid", columns: 3, order: "source", overflow: "wrap" },
  desktop: { layout: "grid", columns: 4, order: "source", overflow: "wrap" },
};

type VariantSeed = Omit<
  StorefrontVariantDefinition,
  "version" | "requirements" | "requiredCapabilities" | "compatibleBusinessFamilies" | "previewSpec" | "lifecycle" | "visibility"
> & {
  requirements?: StorefrontVariantDefinition["requirements"];
  requiredCapabilities?: readonly string[];
  compatibleBusinessFamilies?: readonly StoreBusinessFamily[];
  previewSpec?: StorefrontVariantDefinition["previewSpec"];
  lifecycle?: StorefrontVariantDefinition["lifecycle"];
  visibility?: StorefrontVariantDefinition["visibility"];
  version?: number;
};

function variant(seed: VariantSeed): StorefrontVariantDefinition {
  return {
    ...seed,
    compatibleBusinessFamilies: seed.compatibleBusinessFamilies ?? ALL_BUSINESS_FAMILIES,
    requiredCapabilities: seed.requiredCapabilities ?? [],
    requirements: seed.requirements ?? {},
    previewSpec: seed.previewSpec ?? {
      fixtureId: `${seed.blockType}-standard`,
      alt: `${seed.label} ${seed.blockType.replaceAll("-", " ")} style preview`,
      desktop: { mode: "generated" },
      mobile: { mode: "generated" },
    },
    lifecycle: seed.lifecycle ?? "published",
    visibility: seed.visibility ?? "global",
    version: seed.version ?? 1,
  };
}

function catalogVariant(seed: VariantSeed): StorefrontVariantDefinition {
  return variant({
    ...seed,
    compatibleBusinessFamilies: seed.compatibleBusinessFamilies ?? CATALOG_BUSINESS_FAMILIES,
    requiredCapabilities: seed.requiredCapabilities ?? ["catalog"],
  });
}

export const canonicalStorefrontVariantRegistry: readonly StorefrontVariantDefinition[] = [
  variant({ id: "full-bleed", blockType: "hero", label: "Full Image Story", description: "Edge-to-edge hero media with overlaid content.", guidance: "Use when the hero has a strong image and short conversion copy.", rendererKey: "hero/full-bleed", responsive: MOBILE_STACK, safeFallback: "centered", performanceClass: "media-heavy", interactionRequirement: "none", requirements: { requiresPrimaryMedia: true, minMediaItems: 1 }, recommendedFor: { businessFamilies: ["commerce", "listing"] }, editor: { group: "media", order: 10, preview: "thumbnail", badge: "media" } }),
  variant({ id: "split", blockType: "hero", label: "Editorial Split", description: "Two-part hero with content and media side by side on larger screens.", guidance: "Mobile stacks to one column; do not rely on desktop side-by-side placement for meaning.", rendererKey: "hero/split", responsive: HERO_SPLIT_RESPONSIVE, safeFallback: "centered", performanceClass: "standard", interactionRequirement: "none", editor: { group: "layout", order: 20, preview: "schematic", badge: "recommended" } }),
  variant({ id: "centered", blockType: "hero", label: "Minimal Product Focus", description: "Centered hero copy with optional supporting media.", guidance: "Safest general-purpose hero and fallback when specialized requirements are unavailable.", rendererKey: "hero/centered", responsive: MOBILE_STACK, safeFallback: "centered", performanceClass: "light", interactionRequirement: "none", editor: { group: "layout", order: 30, preview: "schematic", badge: "recommended" } }),
  variant({ id: "editorial", blockType: "hero", label: "Magazine / Bold Typography", description: "Magazine-like hero composition with stronger typographic hierarchy.", guidance: "Use for story-led storefronts; keep mobile copy concise.", rendererKey: "hero/editorial", responsive: MOBILE_STACK, safeFallback: "centered", performanceClass: "standard", interactionRequirement: "none", editor: { group: "layout", order: 40, preview: "thumbnail" } }),
  variant({ id: "poster", blockType: "hero", label: "Campaign Poster", description: "Poster-oriented hero emphasizing campaign artwork.", guidance: "Use only when campaign media is available; otherwise fall back to centered.", rendererKey: "hero/poster", responsive: MOBILE_STACK, safeFallback: "centered", performanceClass: "media-heavy", interactionRequirement: "none", requirements: { requiresPrimaryMedia: true, minMediaItems: 1 }, editor: { group: "media", order: 50, preview: "thumbnail", badge: "media" } }),
  variant({ id: "collection-spotlight", blockType: "hero", label: "Collection Spotlight", description: "Hero treatment for a featured collection or category.", guidance: "Pair with a valid destination and collection-oriented content.", rendererKey: "hero/collection-spotlight", responsive: MOBILE_STACK, safeFallback: "split", performanceClass: "standard", interactionRequirement: "none", requiredCapabilities: ["catalog"], compatibleBusinessFamilies: CATALOG_BUSINESS_FAMILIES, editor: { group: "commerce", order: 60, preview: "thumbnail" } }),

  catalogVariant({ id: "carousel", blockType: "featured-products", label: "Carousel", description: "Scrollable featured product rail.", guidance: "Use for larger assortments where preserving mobile vertical space matters.", rendererKey: "featured-products/carousel", responsive: MOBILE_CAROUSEL, safeFallback: "2-col", performanceClass: "interactive", interactionRequirement: "carousel", requirements: { minItems: 2 }, editor: { group: "commerce", order: 10, preview: "thumbnail", badge: "recommended" } }),
  catalogVariant({ id: "2-col", blockType: "featured-products", label: "2 columns", description: "Two-column product layout on larger screens.", guidance: "Mobile remains compact and readable; suitable for image-forward catalogs.", rendererKey: "featured-products/2-col", responsive: PRODUCT_GRID_LG, safeFallback: "2-col", performanceClass: "standard", interactionRequirement: "none", editor: { group: "commerce", order: 20, preview: "schematic" } }),
  catalogVariant({ id: "3-col", blockType: "featured-products", label: "3 columns", description: "Three-column desktop product grid.", guidance: "Use when cards remain legible at medium widths.", rendererKey: "featured-products/3-col", responsive: PRODUCT_GRID_LG, safeFallback: "2-col", performanceClass: "standard", interactionRequirement: "none", editor: { group: "commerce", order: 30, preview: "schematic", badge: "recommended" } }),
  catalogVariant({ id: "grid", blockType: "featured-products", label: "Legacy grid", description: "Legacy three-column product grid retained for stores that already persisted this style ID.", guidance: "Existing stores remain supported; use 3 columns for new section styling.", rendererKey: "featured-products/grid", responsive: PRODUCT_GRID_LG, safeFallback: "3-col", performanceClass: "standard", interactionRequirement: "none", lifecycle: "deprecated", editor: { group: "specialized", order: 35, preview: "schematic", badge: "advanced" } }),
  catalogVariant({ id: "4-col", blockType: "featured-products", label: "4 columns", description: "Dense four-column desktop product grid.", guidance: "Best for compact cards; never force four columns on mobile or tablet.", rendererKey: "featured-products/4-col", responsive: PRODUCT_GRID_LG, safeFallback: "3-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 4 }, editor: { group: "commerce", order: 40, preview: "schematic" } }),
  catalogVariant({ id: "3-col-sidebar-left", blockType: "featured-products", label: "3 columns + left sidebar", description: "Product grid with a supporting left-side panel on desktop.", guidance: "Collapse the sidebar into source order on mobile.", rendererKey: "featured-products/3-col-sidebar-left", responsive: MOBILE_STACK, safeFallback: "3-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 3 }, editor: { group: "specialized", order: 50, preview: "schematic", badge: "advanced" } }),
  catalogVariant({ id: "3-col-sidebar-right", blockType: "featured-products", label: "3 columns + right sidebar", description: "Product grid with a supporting right-side panel on desktop.", guidance: "Collapse the sidebar into source order on mobile.", rendererKey: "featured-products/3-col-sidebar-right", responsive: MOBILE_STACK, safeFallback: "3-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 3 }, editor: { group: "specialized", order: 60, preview: "schematic", badge: "advanced" } }),

  catalogVariant({ id: "editorial-grid", blockType: "featured-products", label: "Editorial Grid", description: "Asymmetric product grid with one lead product and supporting collection.", guidance: "Use for image-led assortments where one product should anchor the story.", rendererKey: "featured-products/editorial-grid", responsive: PRODUCT_GRID_LG, safeFallback: "3-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 3 }, editor: { group: "commerce", order: 70, preview: "thumbnail", badge: "recommended" } }),
  catalogVariant({ id: "center-focus-rail", blockType: "featured-products", label: "Center-Focus Rail", description: "Snap-scrolling product rail with a strong centered browsing rhythm.", guidance: "Use for curated collections where touch-first horizontal browsing should preserve vertical space.", rendererKey: "featured-products/center-focus-rail", responsive: MOBILE_CAROUSEL, safeFallback: "carousel", performanceClass: "standard", interactionRequirement: "optional", requirements: { minItems: 2 }, editor: { group: "commerce", order: 80, preview: "thumbnail" } }),
  catalogVariant({ id: "compact-commerce-grid", blockType: "featured-products", label: "Compact Commerce Grid", description: "Compact multi-column product grid for efficient catalog scanning.", guidance: "Use for commerce-heavy pages where more products should remain visible without crowding mobile.", rendererKey: "featured-products/compact-commerce-grid", responsive: MOBILE_GRID, safeFallback: "4-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 4 }, editor: { group: "commerce", order: 90, preview: "thumbnail" } }),
  catalogVariant({ id: "product-spotlight", blockType: "featured-products", label: "Product Spotlight", description: "One oversized lead product supported by a smaller product set.", guidance: "Use when a hero product should dominate while preserving access to supporting products.", rendererKey: "featured-products/product-spotlight", responsive: PRODUCT_GRID_LG, safeFallback: "2-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 2 }, editor: { group: "commerce", order: 100, preview: "thumbnail" } }),
  catalogVariant({ id: "magazine-rail", blockType: "featured-products", label: "Magazine Rail", description: "Editorial horizontal rail with staggered product rhythm.", guidance: "Use for fashion, craft, or collection storytelling where browsing should feel less grid-like.", rendererKey: "featured-products/magazine-rail", responsive: MOBILE_CAROUSEL, safeFallback: "carousel", performanceClass: "standard", interactionRequirement: "optional", requirements: { minItems: 2 }, editor: { group: "commerce", order: 110, preview: "thumbnail" } }),
  catalogVariant({ id: "dense-catalog", blockType: "featured-products", label: "Dense Catalog", description: "High-density catalog grid with restrained card chrome.", guidance: "Use for larger inventories; mobile remains limited to two columns.", rendererKey: "featured-products/dense-catalog", responsive: MOBILE_GRID, safeFallback: "4-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 4 }, editor: { group: "commerce", order: 120, preview: "thumbnail" } }),

  catalogVariant({ id: "2-col", blockType: "recommended-products", label: "2 columns", description: "Two-column recommendation grid.", guidance: "Use for smaller recommendation sets.", rendererKey: "recommended-products/2-col", responsive: PRODUCT_GRID_LG, safeFallback: "2-col", performanceClass: "standard", interactionRequirement: "none", editor: { group: "commerce", order: 10, preview: "schematic" } }),
  catalogVariant({ id: "3-col", blockType: "recommended-products", label: "3 columns", description: "Three-column recommendation grid.", guidance: "Balanced default for recommendation sections.", rendererKey: "recommended-products/3-col", responsive: PRODUCT_GRID_LG, safeFallback: "2-col", performanceClass: "standard", interactionRequirement: "none", editor: { group: "commerce", order: 20, preview: "schematic", badge: "recommended" } }),
  catalogVariant({ id: "4-col", blockType: "recommended-products", label: "4 columns", description: "Dense four-column recommendation grid.", guidance: "Use when at least four recommendations are normally available.", rendererKey: "recommended-products/4-col", responsive: PRODUCT_GRID_LG, safeFallback: "3-col", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 4 }, editor: { group: "commerce", order: 30, preview: "schematic" } }),

  catalogVariant({ id: "grid", blockType: "recommended-products", label: "Threads editorial grid", description: "Compact editorial new-arrivals grid used by the Threads template.", guidance: "Threads-only presentation for the template's editorial new-arrivals section.", rendererKey: "threads/recommended-products/grid", responsive: { mobile: { layout: "grid", columns: 2, order: "source", overflow: "wrap" }, tablet: { layout: "grid", columns: 4, order: "source", overflow: "wrap" }, desktop: { layout: "grid", columns: 4, order: "source", overflow: "wrap" } }, safeFallback: "3-col", performanceClass: "standard", interactionRequirement: "none", recommendedFor: { templateIds: ["threads"] }, visibility: "template-exclusive", editor: { group: "specialized", order: 90, preview: "thumbnail", badge: "recommended" } }),

  catalogVariant({ id: "cards", blockType: "category-showcase", label: "Image Cards", description: "Category cards with optional media.", guidance: "General-purpose category presentation with safe icon fallbacks.", rendererKey: "category-showcase/cards", responsive: MOBILE_GRID, safeFallback: "compact-list", performanceClass: "standard", interactionRequirement: "none", editor: { group: "commerce", order: 10, preview: "thumbnail", badge: "recommended" } }),
  catalogVariant({ id: "carousel", blockType: "category-showcase", label: "Compact Editorial Rail", description: "Horizontally scrollable category rail.", guidance: "Keep touch scrolling primary on mobile; arrows are enhancement only.", rendererKey: "category-showcase/carousel", responsive: MOBILE_CAROUSEL, safeFallback: "cards", performanceClass: "interactive", interactionRequirement: "carousel", requirements: { minItems: 2 }, editor: { group: "commerce", order: 20, preview: "thumbnail" } }),
  catalogVariant({ id: "circular-categories", blockType: "category-showcase", label: "Circular Categories", description: "Compact circular category portraits with direct labels.", guidance: "Use for recognizable category imagery and short labels; mobile stays two-across for the platform mobile-width contract.", rendererKey: "category-showcase/circular-categories", responsive: { mobile: { layout: "grid", columns: 2, order: "source", overflow: "wrap" }, tablet: { layout: "grid", columns: 4, order: "source", overflow: "wrap" }, desktop: { layout: "grid", columns: 6, order: "source", overflow: "wrap" } }, safeFallback: "cards", performanceClass: "standard", interactionRequirement: "none", editor: { group: "commerce", order: 25, preview: "thumbnail" } }),
  catalogVariant({ id: "collection-tiles", blockType: "category-showcase", label: "Collection Tiles", description: "Asymmetric image-led collection tiles with a dominant lead category.", guidance: "Use when several category images are available; mobile collapses to a stable two-column tile grid.", rendererKey: "category-showcase/collection-tiles", responsive: { mobile: { layout: "grid", columns: 2, order: "source", overflow: "wrap" }, tablet: { layout: "grid", columns: 2, order: "source", overflow: "wrap" }, desktop: { layout: "grid", columns: 4, order: "source", overflow: "wrap" } }, safeFallback: "cards", performanceClass: "media-heavy", interactionRequirement: "none", requirements: { minItems: 3 }, editor: { group: "media", order: 35, preview: "thumbnail", badge: "media" } }),

  catalogVariant({ id: "masonry", blockType: "category-showcase", label: "Masonry", description: "Image-led staggered category layout.", guidance: "Use when category media is consistently available; mobile flattens the composition.", rendererKey: "category-showcase/masonry", responsive: MASONRY_RESPONSIVE, safeFallback: "cards", performanceClass: "media-heavy", interactionRequirement: "none", requirements: { minItems: 3, minMediaItems: 3 }, editor: { group: "media", order: 30, preview: "thumbnail", badge: "media" } }),
  catalogVariant({ id: "compact-list", blockType: "category-showcase", label: "Minimal List", description: "Low-media category list.", guidance: "Safe fallback for stores without category imagery.", rendererKey: "category-showcase/compact-list", responsive: MOBILE_STACK, safeFallback: "compact-list", performanceClass: "light", interactionRequirement: "none", editor: { group: "commerce", order: 40, preview: "schematic" } }),

  catalogVariant({ id: "default", blockType: "comparison", label: "Default", description: "General product comparison layout.", guidance: "Keep the compared set intentionally small on mobile.", rendererKey: "comparison/default", responsive: MOBILE_STACK, safeFallback: "default", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 2 }, editor: { group: "commerce", order: 10, preview: "schematic", badge: "recommended" } }),
  catalogVariant({ id: "tech-spec", blockType: "comparison", label: "Tech spec", description: "Specification-forward comparison layout.", guidance: "Use when products have meaningful comparable technical attributes.", rendererKey: "comparison/tech-spec", responsive: MOBILE_STACK, safeFallback: "default", performanceClass: "standard", interactionRequirement: "none", requirements: { minItems: 2 }, recommendedFor: { templateIds: ["electronics"] }, editor: { group: "specialized", order: 20, preview: "thumbnail", badge: "advanced" } }),

  variant({ id: "standard", blockType: "promo-banner", label: "Standard", description: "General promotion banner.", guidance: "Use for a single clear offer and CTA.", rendererKey: "promo-banner/standard", responsive: MOBILE_STACK, safeFallback: "standard", performanceClass: "light", interactionRequirement: "none", editor: { group: "content", order: 10, preview: "schematic", badge: "recommended" } }),
  variant({ id: "contact-cta", blockType: "promo-banner", label: "Contact CTA", description: "Promotion treatment oriented around contacting or requesting a quote.", guidance: "Best for service, inquiry, and lead-generation storefronts.", rendererKey: "promo-banner/contact-cta", responsive: MOBILE_STACK, safeFallback: "standard", performanceClass: "light", interactionRequirement: "none", recommendedFor: { businessFamilies: ["service", "listing"] }, editor: { group: "content", order: 20, preview: "schematic" } }),

  variant({ id: "dual-editorial", blockType: "promo-banner", label: "Threads dual editorial", description: "Paired editorial campaign cards used by the Threads template.", guidance: "Threads-only dual campaign treatment with two preserved promotional messages.", rendererKey: "threads/promo-banner/dual-editorial", responsive: { mobile: { layout: "stack", columns: 1, order: "source", overflow: "wrap" }, tablet: { layout: "two-column", columns: 2, order: "source", overflow: "wrap" }, desktop: { layout: "two-column", columns: 2, order: "source", overflow: "clip" } }, safeFallback: "standard", performanceClass: "media-heavy", interactionRequirement: "none", recommendedFor: { templateIds: ["threads"] }, visibility: "template-exclusive", editor: { group: "specialized", order: 90, preview: "thumbnail", badge: "recommended" } }),

  variant({ id: "image-campaign-banner", blockType: "promo-banner", label: "Image Campaign Banner", description: "Full-width campaign image with overlaid promotional copy and CTA.", guidance: "Use only with strong campaign media and concise copy.", rendererKey: "promo-banner/image-campaign-banner", responsive: MOBILE_STACK, safeFallback: "campaign-cta", performanceClass: "media-heavy", interactionRequirement: "none", requirements: { requiresPrimaryMedia: true, recommendedContentKeys: ["badgeText"] }, editor: { group: "media", order: 30, preview: "thumbnail", badge: "media" } }),
  variant({ id: "dual-promo", blockType: "promo-banner", label: "Dual Promo", description: "Two coordinated promotional tiles for parallel campaigns or offers.", guidance: "Use when two distinct campaign destinations deserve equal prominence.", rendererKey: "promo-banner/dual-promo", responsive: MOBILE_STACK, safeFallback: "campaign-cta", performanceClass: "media-heavy", interactionRequirement: "none", requirements: { recommendedContentKeys: ["secondaryTitle", "secondaryImageUrl", "secondaryCtaText", "secondaryCtaLink"] }, editor: { group: "media", order: 40, preview: "thumbnail" } }),
  variant({ id: "campaign-cta", blockType: "promo-banner", label: "Campaign CTA", description: "Typography-led campaign call to action without mandatory media.", guidance: "Use for launches and timely offers when message hierarchy matters more than imagery.", rendererKey: "promo-banner/campaign-cta", responsive: MOBILE_STACK, safeFallback: "standard", performanceClass: "light", interactionRequirement: "none", editor: { group: "content", order: 50, preview: "thumbnail", badge: "recommended" } }),

  variant({ id: "cards", blockType: "trust-badges", label: "Cards", description: "Trust promises presented as individual cards.", guidance: "Use for short merchant promises with optional icons.", rendererKey: "trust-badges/cards", responsive: MOBILE_STACK, safeFallback: "cards", performanceClass: "light", interactionRequirement: "none", editor: { group: "content", order: 10, preview: "schematic", badge: "recommended" } }),
  variant({ id: "stats", blockType: "trust-badges", label: "Stats", description: "Compact numeric or proof-point presentation.", guidance: "Use only when claims are factual and maintained by the merchant.", rendererKey: "trust-badges/stats", responsive: MOBILE_GRID, safeFallback: "cards", performanceClass: "light", interactionRequirement: "none", editor: { group: "content", order: 20, preview: "schematic" } }),

  variant({ id: "brand-values", blockType: "trust-badges", label: "Threads brand values", description: "Compact four-value editorial trust strip used by the Threads template.", guidance: "Threads-only value strip for short brand promises and cultural positioning.", rendererKey: "threads/trust-badges/brand-values", responsive: MOBILE_GRID, safeFallback: "cards", performanceClass: "light", interactionRequirement: "none", recommendedFor: { templateIds: ["threads"] }, visibility: "template-exclusive", editor: { group: "specialized", order: 90, preview: "thumbnail", badge: "recommended" } }),

  variant({ id: "gallery", blockType: "social-feed", label: "Gallery", description: "Image gallery for social or campaign media.", guidance: "Use when multiple quality images are available.", rendererKey: "social-feed/gallery", responsive: MOBILE_GRID, safeFallback: "logo-strip", performanceClass: "media-heavy", interactionRequirement: "none", requirements: { minMediaItems: 2 }, editor: { group: "media", order: 10, preview: "thumbnail", badge: "media" } }),
  variant({ id: "logo-strip", blockType: "social-feed", label: "Logo strip", description: "Compact horizontal strip for logos or simple media marks.", guidance: "Safe low-complexity fallback when a full gallery is not appropriate.", rendererKey: "social-feed/logo-strip", responsive: MOBILE_CAROUSEL, safeFallback: "logo-strip", performanceClass: "light", interactionRequirement: "optional", editor: { group: "media", order: 20, preview: "thumbnail" } }),
  variant({ id: "before-after", blockType: "social-feed", label: "Before / after", description: "Paired media treatment for transformation storytelling.", guidance: "Use only when at least two semantically paired images exist.", rendererKey: "social-feed/before-after", responsive: MOBILE_STACK, safeFallback: "gallery", performanceClass: "media-heavy", interactionRequirement: "optional", requirements: { minMediaItems: 2 }, editor: { group: "specialized", order: 30, preview: "thumbnail", badge: "advanced" } }),

  variant({ id: "standard", blockType: "rich-text", label: "Standard", description: "General rich-text section.", guidance: "Use for policy, story, and supporting content.", rendererKey: "rich-text/standard", responsive: MOBILE_STACK, safeFallback: "standard", performanceClass: "light", interactionRequirement: "none", editor: { group: "content", order: 10, preview: "schematic", badge: "recommended" } }),
  variant({ id: "centered", blockType: "rich-text", label: "Legacy centered", description: "Legacy centered rich-text treatment retained for stores that already persisted this style ID.", guidance: "Existing stores remain supported; use Standard for new section styling.", rendererKey: "rich-text/centered", responsive: MOBILE_STACK, safeFallback: "standard", performanceClass: "light", interactionRequirement: "none", lifecycle: "deprecated", editor: { group: "specialized", order: 15, preview: "schematic", badge: "advanced" } }),
  variant({ id: "brand-story", blockType: "rich-text", label: "Brand story", description: "Story-led rich text with stronger editorial framing.", guidance: "Use for origin, process, or brand narrative sections.", rendererKey: "rich-text/brand-story", responsive: MOBILE_STACK, safeFallback: "standard", performanceClass: "standard", interactionRequirement: "none", editor: { group: "content", order: 20, preview: "thumbnail" } }),
  variant({ id: "blog-posts", blockType: "rich-text", label: "Blog posts", description: "Rich-text adapter used by blog-oriented storefront compositions.", guidance: "Use only where the renderer has a real content source; otherwise fall back to standard.", rendererKey: "rich-text/blog-posts", responsive: MOBILE_STACK, safeFallback: "standard", performanceClass: "standard", interactionRequirement: "none", editor: { group: "specialized", order: 30, preview: "thumbnail", badge: "advanced" } }),
  variant({ id: "split-brand-story", blockType: "rich-text", label: "Split Brand Story", description: "Brand narrative paired with a large supporting image.", guidance: "Use for origin, process, founder, or craftsmanship stories with meaningful media.", rendererKey: "rich-text/split-brand-story", responsive: MOBILE_STACK, safeFallback: "minimal-story", performanceClass: "standard", interactionRequirement: "none", requirements: { requiresPrimaryMedia: true, recommendedContentKeys: ["eyebrow"] }, editor: { group: "content", order: 40, preview: "thumbnail", badge: "media" } }),
  variant({ id: "editorial-quote", blockType: "rich-text", label: "Editorial Quote", description: "Large editorial statement with supporting rich-text narrative.", guidance: "Use when the section has one strong statement or brand principle worth emphasizing.", rendererKey: "rich-text/editorial-quote", responsive: MOBILE_STACK, safeFallback: "minimal-story", performanceClass: "light", interactionRequirement: "none", requirements: { recommendedContentKeys: ["eyebrow"] }, editor: { group: "content", order: 50, preview: "thumbnail" } }),
  variant({ id: "minimal-story", blockType: "rich-text", label: "Minimal Story", description: "Restrained text-first brand narrative with minimal visual framing.", guidance: "Use as the safest story treatment when no supporting media is available.", rendererKey: "rich-text/minimal-story", responsive: MOBILE_STACK, safeFallback: "standard", performanceClass: "light", interactionRequirement: "none", editor: { group: "content", order: 60, preview: "thumbnail", badge: "recommended" } }),
] as const;

export function getStorefrontVariantDefinitions(blockType: StorePageBlock["type"]): StorefrontVariantDefinition[] {
  return canonicalStorefrontVariantRegistry.filter((definition) => definition.blockType === blockType);
}

export function getStorefrontVariantDefinition(blockType: StorePageBlock["type"], variantId: string | null | undefined): StorefrontVariantDefinition | undefined {
  if (!variantId) return undefined;
  return canonicalStorefrontVariantRegistry.find((definition) => definition.blockType === blockType && definition.id === variantId);
}

export function getVariantIdsForBlock(blockType: StorePageBlock["type"]): string[] {
  return getStorefrontVariantDefinitions(blockType).map((definition) => definition.id);
}

export function resolveStorefrontVariant(blockType: StorePageBlock["type"], variantId: string | null | undefined): StorefrontVariantDefinition | undefined {
  const requested = getStorefrontVariantDefinition(blockType, variantId);
  if (requested) return requested;

  const definitions = getStorefrontVariantDefinitions(blockType);
  const explicitFallback = definitions.find((definition) => definition.id === definitions[0]?.safeFallback);
  return explicitFallback ?? definitions[0];
}
