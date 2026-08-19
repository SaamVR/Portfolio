import type { StorePageBlock } from "@/lib/cms/schema";
import {
  getStorefrontTemplateDefinition,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";

export type LayoutVariantOption = {
  id: string;
  label: string;
  guidance: string;
  previewSummary?: string;
  recommended?: boolean;
};

export type BasicFlowSectionId = "catalog" | "delivery" | "checkout" | "support";

export type BasicFlowSectionConfig = {
  id: BasicFlowSectionId;
  title: string;
  description: string;
  visible: boolean;
};

export type BasicBlockCoachConfig = {
  tip: string;
  titleOverrides?: Partial<Record<"title" | "subtitle" | "tagline" | "ctaText" | "limit", string>>;
  priorityFields?: string[];
  priorityLabel?: string;
};

export type SharedBlockSuggestionInfo = {
  headline: string;
  reason: string;
  caveat?: string;
  recommended: boolean;
};

export type SharedBlockCopy = {
  featuredSourceLabel: string;
  featuredSourceTitle: string;
  featuredSourceDescription: string;
  featuredCategoryLabel: string;
  featuredTypeLabel: string;
  comparisonCategoryLabel: string;
  comparisonTypeLabel: string;
  categorySourceLabel: string;
  categorySourceTitle: string;
  categorySourceDescription: string;
  comparisonSourceTitle: string;
  comparisonSourceDescription: string;
  faqListTitle: string;
  faqDescription: string;
  faqEmptyText: string;
  trustListTitle: string;
  trustDescription: string;
  trustEmptyText: string;
  testimonialListTitle: string;
  testimonialDescription: string;
  testimonialEmptyText: string;
};

export type SharedSourceOption = {
  label: string;
  value: string;
};

export type BasicEditorPageType = "homepage" | "product" | "checkout" | "contact" | "about" | "catalog" | "custom";

export type BasicStarterLayoutRecommendation = {
  id: string;
  title: string;
  summary: string;
  bestFor: string;
  sectionFocus: "content" | "layout" | "theme" | "pages";
};

const baseLayoutVariantOptions: Partial<Record<StorePageBlock["type"], LayoutVariantOption[]>> = {
  hero: [
    { id: "full-bleed", label: "Full Bleed", guidance: "Best when one strong image should sell the first impression.", previewSummary: "Big image first with copy layered over it." },
    { id: "split", label: "Split", guidance: "Best when copy and product media need equal attention.", previewSummary: "Balanced copy and media side by side." },
    { id: "centered", label: "Centered", guidance: "Best for a simple premium message and one focused CTA.", previewSummary: "Quiet centered message with a clear action." },
    { id: "editorial", label: "Editorial", guidance: "Best for story-led and visual brands.", previewSummary: "Magazine-like framing with image drama." },
  ],
  "featured-products": [
    { id: "2-col", label: "2 Columns", guidance: "Bigger cards for premium products or services.", previewSummary: "Large cards and slower scanning." },
    { id: "3-col", label: "3 Columns", guidance: "Balanced density for most stores.", previewSummary: "Balanced browsing density." },
    { id: "4-col", label: "4 Columns", guidance: "Fast scanning for larger catalogs.", previewSummary: "Dense catalog browsing." },
    { id: "3-col-sidebar-left", label: "Left Guide", guidance: "Keeps browsing guidance beside the catalog.", previewSummary: "Products with a left guidance rail." },
    { id: "3-col-sidebar-right", label: "Right Guide", guidance: "Keeps products visually first while retaining guidance.", previewSummary: "Products with a right guidance rail." },
  ],
  "recommended-products": [
    { id: "2-col", label: "2 Columns", guidance: "Use larger recommendation cards when each item needs context." },
    { id: "3-col", label: "3 Columns", guidance: "Balanced recommendations for most storefronts." },
    { id: "4-col", label: "4 Columns", guidance: "Compact recommendation grid for larger catalogs." },
  ],
  "category-showcase": [
    { id: "cards", label: "Cards", guidance: "Clear category discovery with equal visual weight." },
    { id: "carousel", label: "Swipe Rail", guidance: "Best when mobile browsing should stay short and swipeable." },
    { id: "masonry", label: "Masonry", guidance: "Best for visual categories with varied photography." },
    { id: "compact-list", label: "Compact List", guidance: "Best when categories are practical rather than image-led." },
  ],
  "promo-banner": [
    { id: "standard", label: "Promotion", guidance: "A normal campaign or offer CTA using the block copy and link." },
    { id: "contact-cta", label: "WhatsApp / Contact", guidance: "Uses existing WhatsApp support settings automatically and falls back to Contact.", previewSummary: "Direct contact CTA without duplicate phone settings." },
  ],
  "trust-badges": [
    { id: "cards", label: "Trust Cards", guidance: "Icons and short reassurance for delivery, support, returns, or payment." },
    { id: "stats", label: "Proof Numbers", guidance: "Use badge labels as strong proof numbers such as 10K+ Orders, 4.9 Rating, or 3 Years." },
  ],
  "social-feed": [
    { id: "gallery", label: "Gallery", guidance: "A visual grid for social or brand imagery." },
    { id: "logo-strip", label: "Logo / Press Strip", guidance: "A compact row for partner, brand, publication, or trust logos." },
    { id: "before-after", label: "Before / After", guidance: "Uses the first two images as a side-by-side transformation comparison." },
  ],
  "rich-text": [
    { id: "standard", label: "Text Story", guidance: "Focused editorial copy without extra media." },
    { id: "brand-story", label: "Image + Brand Story", guidance: "Pairs a brand image with the story in a two-column layout." },
    { id: "blog-posts", label: "Blog Articles", guidance: "Turns this existing section slot into the store's configured Blog homepage widget so it can be reordered normally." },
  ],
};

const templateLayoutVariantOrder: Partial<Record<StorefrontTemplateId, Partial<Record<StorePageBlock["type"], string[]>>>> = {
  fashion: { hero: ["editorial", "full-bleed", "split", "centered"], "featured-products": ["2-col", "3-col", "4-col"], "category-showcase": ["cards", "masonry", "carousel"] },
  beauty: { hero: ["split", "centered", "full-bleed"], "featured-products": ["2-col", "3-col"], "category-showcase": ["cards", "carousel"] },
  electronics: { hero: ["split", "full-bleed", "centered"], "featured-products": ["4-col", "3-col", "3-col-sidebar-left", "3-col-sidebar-right"], "category-showcase": ["cards", "compact-list"] },
  food: { hero: ["split", "centered"], "featured-products": ["2-col", "3-col"], "category-showcase": ["compact-list", "carousel", "cards"], "promo-banner": ["contact-cta", "standard"] },
  crafts: { hero: ["editorial", "split", "centered"], "featured-products": ["2-col", "3-col"], "category-showcase": ["masonry", "cards", "carousel"], "rich-text": ["brand-story", "standard", "blog-posts"] },
  "single-product": { hero: ["split", "full-bleed", "centered"], "trust-badges": ["cards", "stats"] },
  "inquiry-catalog": { hero: ["split", "centered"], "featured-products": ["3-col", "4-col", "3-col-sidebar-left"], "category-showcase": ["cards", "compact-list"], "promo-banner": ["contact-cta", "standard"] },
  service: { hero: ["split", "centered"], "featured-products": ["2-col", "3-col"], "category-showcase": ["cards", "compact-list"], "promo-banner": ["contact-cta", "standard"], "trust-badges": ["stats", "cards"] },
  booking: { hero: ["split", "centered"], "featured-products": ["2-col", "3-col"], "category-showcase": ["cards", "compact-list"], "promo-banner": ["contact-cta", "standard"] },
  hotel: { hero: ["full-bleed", "split", "centered"], "featured-products": ["2-col", "3-col"], "category-showcase": ["cards", "carousel"], "promo-banner": ["contact-cta", "standard"] },
  "real-estate": { hero: ["full-bleed", "split", "centered"], "featured-products": ["3-col", "3-col-sidebar-left", "4-col"], "category-showcase": ["cards", "compact-list"], "promo-banner": ["contact-cta", "standard"] },
  subscriptions: { hero: ["split", "centered"], "featured-products": ["3-col", "4-col"], "category-showcase": ["cards", "compact-list"], "trust-badges": ["stats", "cards"] },
  "digital-downloads": { hero: ["split", "centered"], "featured-products": ["3-col", "4-col"], "category-showcase": ["cards", "compact-list"] },
  landing: { hero: ["centered", "split", "full-bleed"], "promo-banner": ["contact-cta", "standard"], "trust-badges": ["stats", "cards"] },
  "general-catalog": { hero: ["split", "full-bleed", "centered"], "featured-products": ["3-col", "4-col", "3-col-sidebar-left"], "category-showcase": ["cards", "carousel", "compact-list"] },
};

const defaultStarterLayouts: Record<BasicEditorPageType, BasicStarterLayoutRecommendation[]> = {
  homepage: [
    { id: "conversion-home", title: "Conversion Home", summary: "Hero, catalog, proof, and one clear next step.", bestFor: "Most commerce and service storefronts.", sectionFocus: "layout" },
    { id: "story-home", title: "Story Home", summary: "Hero, brand story, highlights, Blog, and customer proof.", bestFor: "Story-led and visual brands.", sectionFocus: "content" },
  ],
  product: [
    { id: "proof-first-product", title: "Proof First", summary: "Lead with media, value, and trust cues.", bestFor: "Offers that need confidence before price.", sectionFocus: "content" },
    { id: "spec-first-product", title: "Spec First", summary: "Surface configuration and technical details early.", bestFor: "Technical, room, subscription, or service offers.", sectionFocus: "pages" },
  ],
  checkout: [{ id: "trust-checkout", title: "Trust Checkout", summary: "Simple checkout with visible payment and reassurance.", bestFor: "Reducing hesitation before purchase.", sectionFocus: "pages" }],
  contact: [{ id: "contact-action", title: "Action Contact", summary: "Lead with the fastest contact method, then support details.", bestFor: "WhatsApp, booking, inquiry, or support-led flows.", sectionFocus: "content" }],
  about: [{ id: "trust-story", title: "Trust Story", summary: "Business story, proof, people, and values.", bestFor: "Brands selling through origin, mission, or founder trust.", sectionFocus: "content" }],
  catalog: [
    { id: "browse-fast", title: "Browse Fast", summary: "Clear discovery path, category cues, and compact browsing.", bestFor: "Catalogs where scanning speed matters.", sectionFocus: "pages" },
    { id: "editorial-browse", title: "Editorial Browse", summary: "Category story first, then curated items.", bestFor: "Fashion, beauty, crafts, and visual catalogs.", sectionFocus: "layout" },
  ],
  custom: [{ id: "simple-custom", title: "Simple Custom", summary: "One main goal with a few supporting sections.", bestFor: "Campaign and utility pages.", sectionFocus: "layout" }],
};

const businessHomepageStarter: Partial<Record<StorefrontTemplateId, BasicStarterLayoutRecommendation>> = {
  food: { id: "food-menu-home", title: "Menu to Order", summary: "Promise, menu categories, popular dishes, proof, and Order CTA.", bestFor: "Restaurants and delivery-first food stores.", sectionFocus: "content" },
  service: { id: "service-lead-home", title: "Service to Lead", summary: "Outcome hero, services, proof, FAQ, and direct contact CTA.", bestFor: "Quote and inquiry-led services.", sectionFocus: "content" },
  booking: { id: "booking-home", title: "Service to Booking", summary: "Service discovery, proof, FAQ, and a persistent Book action.", bestFor: "Appointment and reservation flows.", sectionFocus: "layout" },
  hotel: { id: "hotel-home", title: "Rooms to Stay", summary: "Property hero, room discovery, trust, story, and Book action.", bestFor: "Hotels and accommodation storefronts.", sectionFocus: "layout" },
  "real-estate": { id: "property-home", title: "Property to Inquiry", summary: "Property discovery, proof, brand story, and Contact Agent action.", bestFor: "Property and agent-led lead capture.", sectionFocus: "content" },
  subscriptions: { id: "plans-home", title: "Plans to Subscribe", summary: "Plan promise, comparison, proof numbers, and subscription CTA.", bestFor: "Recurring offers and memberships.", sectionFocus: "content" },
  "digital-downloads": { id: "downloads-home", title: "Browse to Download", summary: "Digital catalog, proof, and fast purchase expectations.", bestFor: "Digital files, assets, courses, and downloads.", sectionFocus: "content" },
};

const defaultBlockCoach: Partial<Record<StorePageBlock["type"], BasicBlockCoachConfig>> = {
  hero: {
    tip: "Lead with one clear promise and one primary action. Use focal controls when the important subject is being cropped on mobile.",
    priorityFields: ["title", "subtitle", "ctaText", "mediaUrl", "imagePosition", "focalX", "focalY"],
    priorityLabel: "Message and crop",
    titleOverrides: { title: "Headline", subtitle: "Supporting message", ctaText: "Primary action" },
  },
  "promo-banner": {
    tip: "Use a promotion for one timely offer, or switch to WhatsApp / Contact to reuse the store's existing support settings.",
    priorityFields: ["badgeText", "title", "subtitle", "ctaText", "ctaLink"],
    priorityLabel: "Campaign message",
  },
  "category-showcase": {
    tip: "Keep discovery short on mobile. Use Swipe Rail for long category sets and focal controls for awkward image crops.",
    priorityFields: ["title", "tagline", "source", "limit", "imagePosition", "focalX", "focalY"],
    priorityLabel: "Discovery and crop",
  },
  "featured-products": {
    tip: "Choose the smallest useful source set. Two-up mobile cards keep long storefronts from becoming vertical walls.",
    priorityFields: ["title", "tagline", "source", "category", "productType", "limit", "imagePosition", "focalX", "focalY"],
    priorityLabel: "Products and crop",
  },
  "recommended-products": {
    tip: "Recommendations should feel relevant rather than repetitive. Narrow by category or type when useful.",
    priorityFields: ["title", "tagline", "source", "category", "productType", "limit", "imagePosition", "focalX", "focalY"],
  },
  comparison: {
    tip: "Compare only the few options customers genuinely hesitate between.",
    priorityFields: ["title", "tagline", "source", "category", "productType", "limit"],
  },
  "recently-viewed": { tip: "Useful later in the journey; keep it below stronger merchandising sections.", priorityFields: ["title"] },
  "rich-text": {
    tip: "Use Text Story for copy, Image + Brand Story for an editorial brand section, or Blog Articles to place the Blog inside the homepage order.",
    priorityFields: ["eyebrow", "title", "imageUrl", "imageAlt", "imagePosition", "focalX", "focalY"],
  },
  "social-feed": {
    tip: "Reuse this visual section as a gallery, logo/press strip, or before/after proof rather than adding a new block type.",
    priorityFields: ["title", "subtitle"],
  },
  "video-reel": { tip: "Use motion only when it demonstrates something better than a still image.", priorityFields: ["title", "videoUrl", "ctaText", "ctaLink"] },
  "faq-accordion": { tip: "Answer real purchase blockers: payment, delivery, booking, returns, fit, support, or availability.", priorityFields: ["title", "subtitle"] },
  "trust-badges": { tip: "Switch to Proof Numbers when measurable evidence is stronger than generic reassurance.", priorityFields: ["title"] },
  testimonials: {
    tip: "Use manual proof for curated quotes, or set source to live to pull approved customer reviews automatically.",
    priorityFields: ["title", "subtitle", "source", "limit"],
  },
  countdown: { tip: "Use countdowns only for real deadlines; false urgency damages trust.", priorityFields: ["title", "subtitle", "endDate", "ctaText", "ctaLink"] },
};

const noDeliveryTemplates = new Set<StorefrontTemplateId>([
  "landing",
  "inquiry-catalog",
  "service",
  "booking",
  "hotel",
  "real-estate",
  "subscriptions",
  "digital-downloads",
]);

export function getBasicLayoutVariantOptions(
  templateId: StorefrontTemplateId,
  blockType: StorePageBlock["type"],
): LayoutVariantOption[] {
  const base = baseLayoutVariantOptions[blockType] ?? [];
  const preferredOrder = templateLayoutVariantOrder[templateId]?.[blockType];
  if (!preferredOrder?.length) {
    return base.map((option, index) => ({ ...option, recommended: index === 0 }));
  }

  const optionMap = new Map(base.map((option) => [option.id, option]));
  const ordered = [
    ...preferredOrder.map((id) => optionMap.get(id)).filter((option): option is LayoutVariantOption => Boolean(option)),
    ...base.filter((option) => !preferredOrder.includes(option.id)),
  ];

  return ordered.map((option, index) => ({ ...option, recommended: index === 0 }));
}

export function resolveBasicEditorPageType(pageSlug: string): BasicEditorPageType {
  if (pageSlug === "/") return "homepage";
  if (pageSlug.includes("product")) return "product";
  if (pageSlug.includes("checkout")) return "checkout";
  if (pageSlug.includes("contact")) return "contact";
  if (pageSlug.includes("about")) return "about";
  if (pageSlug.includes("shop") || pageSlug.includes("collection")) return "catalog";
  return "custom";
}

export function getBasicStarterLayouts(
  templateId: StorefrontTemplateId,
  pageType: BasicEditorPageType,
): BasicStarterLayoutRecommendation[] {
  if (pageType === "homepage" && businessHomepageStarter[templateId]) {
    return [businessHomepageStarter[templateId]!, ...defaultStarterLayouts.homepage];
  }
  return defaultStarterLayouts[pageType];
}

export function resolveBasicFlowSections(templateId: StorefrontTemplateId): BasicFlowSectionConfig[] {
  const catalog: BasicFlowSectionConfig = {
    id: "catalog",
    title: templateId === "food" ? "Menu and Item Detail" : templateId === "hotel" ? "Rooms and Stay Detail" : templateId === "real-estate" ? "Properties and Listing Detail" : templateId === "booking" || templateId === "service" ? "Services and Detail" : "Shop and Product Detail",
    description: "Guide how customers discover offers and what detail pages should emphasize.",
    visible: templateId !== "landing",
  };
  const delivery: BasicFlowSectionConfig = {
    id: "delivery",
    title: templateId === "food" ? "Tray and Delivery" : "Cart and Delivery",
    description: "Control delivery fees, zones, and fulfillment expectations.",
    visible: !noDeliveryTemplates.has(templateId),
  };
  const checkout: BasicFlowSectionConfig = {
    id: "checkout",
    title: templateId === "booking" ? "Reservation Flow" : templateId === "hotel" ? "Reservation and Deposit Flow" : templateId === "real-estate" || templateId === "inquiry-catalog" ? "Inquiry and Quote Flow" : templateId === "service" || templateId === "landing" ? "Lead Conversion Flow" : templateId === "subscriptions" ? "Subscription Checkout" : templateId === "digital-downloads" ? "Download Purchase Flow" : "Checkout and Payment",
    description: noDeliveryTemplates.has(templateId) ? "Keep the conversion flow aligned with this business model instead of forcing shipping language." : "Set how customers pay and how the buying flow should behave.",
    visible: true,
  };
  const support: BasicFlowSectionConfig = {
    id: "support",
    title: "Account and Support",
    description: "Keep the most useful support and contact methods close to the buying journey.",
    visible: true,
  };
  return [catalog, delivery, checkout, support];
}

export function getBasicBlockCoach(
  templateId: StorefrontTemplateId,
  blockType: StorePageBlock["type"],
): BasicBlockCoachConfig {
  const base = defaultBlockCoach[blockType] ?? {
    tip: "Keep this section focused on one customer job and avoid adding content only to fill space.",
    priorityFields: ["title"],
  };

  const titleOverrides: BasicBlockCoachConfig["titleOverrides"] = { ...(base.titleOverrides ?? {}) };
  if (templateId === "food" && blockType === "featured-products") {
    titleOverrides.title = "Menu section title";
    titleOverrides.tagline = "Menu eyebrow";
    titleOverrides.limit = "Dish count";
  } else if (templateId === "hotel" && blockType === "featured-products") {
    titleOverrides.title = "Rooms section title";
    titleOverrides.limit = "Room count";
  } else if ((templateId === "booking" || templateId === "service") && blockType === "featured-products") {
    titleOverrides.title = "Services section title";
    titleOverrides.limit = "Service count";
  } else if (templateId === "real-estate" && blockType === "featured-products") {
    titleOverrides.title = "Properties section title";
    titleOverrides.limit = "Property count";
  }

  return { ...base, titleOverrides };
}

export function getSharedBlockSuggestionInfo(
  templateId: StorefrontTemplateId,
  blockType: StorePageBlock["type"],
): SharedBlockSuggestionInfo {
  const definition = getStorefrontTemplateDefinition(templateId);
  const recommended = definition.presentation.visibleSections.length === 0
    || definition.presentation.visibleSections.includes(blockType);

  const names: Partial<Record<StorePageBlock["type"], string>> = {
    hero: "Opening hero",
    "featured-products": "Featured offers",
    "recommended-products": "Recommendations",
    "category-showcase": "Category discovery",
    "promo-banner": "Promotion or contact CTA",
    "trust-badges": "Trust and proof",
    testimonials: "Customer proof",
    "social-feed": "Visual proof",
    "rich-text": "Story or Blog",
    "faq-accordion": "FAQ",
  };

  return {
    headline: names[blockType] ?? "Shared storefront section",
    reason: recommended
      ? "This section fits the current template and can be reordered freely with the rest of the homepage."
      : "This section is available across templates when the merchant has a specific reason to use it.",
    caveat: recommended ? undefined : "Keep optional sections intentional so the homepage does not become unnecessarily long.",
    recommended,
  };
}

export function getSharedBlockCopy(templateId: StorefrontTemplateId): SharedBlockCopy {
  const food = templateId === "food";
  const hotel = templateId === "hotel";
  const property = templateId === "real-estate";
  const service = templateId === "service" || templateId === "booking";
  const catalogNoun = food ? "dishes" : hotel ? "rooms" : property ? "properties" : service ? "services" : "products";

  return {
    featuredSourceLabel: `Show ${catalogNoun} From`,
    featuredSourceTitle: `${catalogNoun[0].toUpperCase()}${catalogNoun.slice(1)} source`,
    featuredSourceDescription: `Choose which ${catalogNoun} should populate this section.`,
    featuredCategoryLabel: food ? "Menu category" : hotel ? "Room category" : property ? "Property category" : service ? "Service category" : "Category",
    featuredTypeLabel: food ? "Dish type" : hotel ? "Room type" : property ? "Property type" : service ? "Service type" : "Product type",
    comparisonCategoryLabel: food ? "Menu category" : hotel ? "Room category" : property ? "Property category" : service ? "Service category" : "Comparison category",
    comparisonTypeLabel: food ? "Dish type" : hotel ? "Room type" : property ? "Property type" : service ? "Service type" : "Comparison type",
    categorySourceLabel: food ? "Browse Menu By" : hotel ? "Browse Rooms By" : property ? "Browse Properties By" : service ? "Browse Services By" : "Browse By",
    categorySourceTitle: "Discovery source",
    categorySourceDescription: "Choose categories, types, or the automatic storefront taxonomy.",
    comparisonSourceTitle: "Comparison source",
    comparisonSourceDescription: `Choose which ${catalogNoun} are eligible for comparison.`,
    faqListTitle: "Questions",
    faqDescription: "Answer the real questions customers ask before they act.",
    faqEmptyText: "Add useful questions about payment, delivery, availability, booking, returns, or support.",
    trustListTitle: "Trust signals",
    trustDescription: "Use reassurance cards or proof numbers depending on what is most credible.",
    trustEmptyText: "Add delivery, payment, support, authenticity, rating, order-count, or experience proof.",
    testimonialListTitle: "Customer proof",
    testimonialDescription: "Use manual quotes or switch source to live approved reviews.",
    testimonialEmptyText: "Add specific customer proof, or use live review source when approved reviews already exist.",
  };
}

export function getSharedFeaturedSourceOptions(templateId: StorefrontTemplateId): SharedSourceOption[] {
  const noun = templateId === "food" ? "dishes" : templateId === "hotel" ? "rooms" : templateId === "real-estate" ? "properties" : templateId === "service" || templateId === "booking" ? "services" : templateId === "subscriptions" ? "plans" : templateId === "digital-downloads" ? "downloads" : "products";
  return [
    { label: `Featured ${noun}, or all if none featured`, value: "featured-or-all" },
    { label: `Featured ${noun} only`, value: "featured" },
    { label: `All ${noun}`, value: "all" },
    { label: `Newest ${noun}`, value: "newest" },
    { label: "One category", value: "category" },
    { label: "One type", value: "type" },
  ];
}
