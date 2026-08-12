import type { StorePageBlock } from "@/lib/cms/schema";
import {
  getStorefrontTemplateDefinition,
  getStorefrontTemplateSeedDefinition,
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
    { id: "full-bleed", label: "Full Bleed", guidance: "Best when one strong image should sell the first impression.", previewSummary: "Big image first, copy layered over or tucked below." },
    { id: "split", label: "Split", guidance: "Best when copy and product media need equal attention.", previewSummary: "Balanced copy and media with a clear side-by-side story." },
    { id: "centered", label: "Centered", guidance: "Best for simple premium brands with one focused CTA.", previewSummary: "Quiet, centered message with one main action." },
    { id: "editorial", label: "Editorial", guidance: "Best for fashion, lookbooks, and story-led stores.", previewSummary: "Story-led framing with image drama and magazine spacing." },
  ],
  "featured-products": [
    { id: "2-col", label: "2 Columns", guidance: "Best for premium products that need bigger cards.", previewSummary: "Larger cards, slower scan, stronger storytelling." },
    { id: "3-col", label: "3 Columns", guidance: "Best balanced grid for most stores.", previewSummary: "Balanced browsing density for most product types." },
    { id: "4-col", label: "4 Columns", guidance: "Best for larger catalogs and quick scanning.", previewSummary: "Fast scanning for bigger assortments and comparison." },
    { id: "3-col-sidebar-left", label: "Left Filters", guidance: "Best when shoppers need categories or filters visible.", previewSummary: "Catalog-first view with filters staying in sight." },
    { id: "3-col-sidebar-right", label: "Right Filters", guidance: "Best when product cards should stay visually first.", previewSummary: "Keeps the first look on products while still showing tools." },
  ],
  "category-showcase": [
    { id: "cards", label: "Cards", guidance: "Best for clear category discovery.", previewSummary: "Equal category cards with clean scanning." },
    { id: "carousel", label: "Carousel", guidance: "Best when mobile browsing matters most.", previewSummary: "Swipe-friendly row that feels lighter on small screens." },
    { id: "masonry", label: "Masonry", guidance: "Best for visual brands with varied photos.", previewSummary: "Mixed-height imagery for more atmosphere and visual texture." },
    { id: "compact-list", label: "Compact List", guidance: "Best when categories are practical, not visual.", previewSummary: "Simple directory-style navigation with less visual noise." },
  ],
};

const templateLayoutVariantOrder: Partial<Record<StorefrontTemplateId, Partial<Record<StorePageBlock["type"], string[]>>>> = {
  fashion: {
    hero: ["editorial", "full-bleed", "split", "centered"],
    "featured-products": ["2-col", "3-col", "4-col"],
    "category-showcase": ["cards", "masonry", "carousel"],
  },
  beauty: {
    hero: ["split", "centered", "full-bleed"],
    "featured-products": ["2-col", "3-col"],
    "category-showcase": ["cards", "carousel"],
  },
  electronics: {
    hero: ["split", "full-bleed", "centered"],
    "featured-products": ["4-col", "3-col", "3-col-sidebar-left", "3-col-sidebar-right"],
    "category-showcase": ["cards", "compact-list"],
  },
  food: {
    hero: ["split", "centered"],
    "featured-products": ["2-col", "3-col"],
    "category-showcase": ["compact-list", "carousel", "cards"],
  },
  crafts: {
    hero: ["editorial", "split", "centered"],
    "featured-products": ["2-col", "3-col"],
    "category-showcase": ["masonry", "cards", "carousel"],
  },
  "single-product": {
    hero: ["split", "full-bleed", "centered"],
  },
  "inquiry-catalog": {
    hero: ["split", "centered"],
    "featured-products": ["3-col", "4-col", "3-col-sidebar-left"],
    "category-showcase": ["cards", "compact-list"],
  },
  service: {
    hero: ["split", "centered"],
    "featured-products": ["2-col", "3-col"],
    "category-showcase": ["cards", "compact-list"],
  },
  booking: {
    hero: ["split", "centered"],
    "featured-products": ["2-col", "3-col"],
    "category-showcase": ["cards", "compact-list"],
  },
  hotel: {
    hero: ["full-bleed", "split", "centered"],
    "featured-products": ["2-col", "3-col"],
    "category-showcase": ["cards", "carousel"],
  },
  "real-estate": {
    hero: ["full-bleed", "split", "centered"],
    "featured-products": ["3-col", "3-col-sidebar-left", "4-col"],
    "category-showcase": ["cards", "compact-list"],
  },
  subscriptions: {
    hero: ["split", "centered"],
    "featured-products": ["3-col", "4-col"],
    "category-showcase": ["cards", "compact-list"],
  },
  "digital-downloads": {
    hero: ["split", "centered"],
    "featured-products": ["3-col", "4-col"],
    "category-showcase": ["cards", "compact-list"],
  },
  landing: {
    hero: ["centered", "split", "full-bleed"],
  },
  "general-catalog": {
    hero: ["split", "full-bleed", "centered"],
    "featured-products": ["3-col", "4-col", "3-col-sidebar-left"],
    "category-showcase": ["cards", "carousel", "compact-list"],
  },
};

const defaultStarterLayouts: Record<BasicEditorPageType, BasicStarterLayoutRecommendation[]> = {
  homepage: [
    {
      id: "conversion-home",
      title: "Conversion Home",
      summary: "Hero, featured products or services, trust, and one clear next step.",
      bestFor: "Most stores that need a fast, clear first impression.",
      sectionFocus: "layout",
    },
    {
      id: "story-home",
      title: "Story Home",
      summary: "Hero, brand story, featured highlights, and testimonials.",
      bestFor: "Brands that sell with taste, craft, heritage, or identity.",
      sectionFocus: "content",
    },
  ],
  product: [
    {
      id: "proof-first-product",
      title: "Proof First",
      summary: "Keep the main media, strongest value, and trust cues above the fold.",
      bestFor: "Products that need confidence before price becomes the focus.",
      sectionFocus: "content",
    },
    {
      id: "spec-first-product",
      title: "Spec First",
      summary: "Surface key details, compatibility, or configuration early.",
      bestFor: "Technical, subscription, room, or service-based offers.",
      sectionFocus: "pages",
    },
  ],
  checkout: [
    {
      id: "trust-checkout",
      title: "Trust Checkout",
      summary: "Simple checkout, clear payment methods, and low-friction reassurance.",
      bestFor: "Reducing hesitation right before purchase.",
      sectionFocus: "pages",
    },
  ],
  contact: [
    {
      id: "contact-action",
      title: "Action Contact",
      summary: "Lead with the fastest way to reach the business, then add support details.",
      bestFor: "WhatsApp, booking, inquiry, or support-heavy flows.",
      sectionFocus: "content",
    },
  ],
  about: [
    {
      id: "trust-story",
      title: "Trust Story",
      summary: "Business story, proof, people, and values in one guided flow.",
      bestFor: "Stores that win through origin, mission, or founder trust.",
      sectionFocus: "content",
    },
  ],
  catalog: [
    {
      id: "browse-fast",
      title: "Browse Fast",
      summary: "Strong discovery path, clean category cues, and filters that stay obvious.",
      bestFor: "Catalogs where scanning speed matters most.",
      sectionFocus: "pages",
    },
    {
      id: "editorial-browse",
      title: "Editorial Browse",
      summary: "Category story first, then a more curated product grid.",
      bestFor: "Fashion, beauty, crafts, and more visual discovery paths.",
      sectionFocus: "layout",
    },
  ],
  custom: [
    {
      id: "simple-custom",
      title: "Simple Custom",
      summary: "Keep one main goal, a few supporting sections, and minimal distractions.",
      bestFor: "Campaign, landing, or utility pages.",
      sectionFocus: "layout",
    },
  ],
};

const starterLayoutOverrides: Partial<Record<StorefrontTemplateId, Partial<Record<BasicEditorPageType, BasicStarterLayoutRecommendation[]>>>> = {
  fashion: {
    homepage: [
      {
        id: "fashion-editorial-home",
        title: "Editorial Drop",
        summary: "Hero, collection story, featured products, and style-led trust.",
        bestFor: "Fashion storefronts selling mood, collection, and look.",
        sectionFocus: "layout",
      },
      {
        id: "fashion-conversion-home",
        title: "Collection to Cart",
        summary: "Hero, category path, featured products, and direct shopping CTA.",
        bestFor: "Stores needing faster browse-to-buy movement.",
        sectionFocus: "content",
      },
    ],
    catalog: [
      {
        id: "fashion-lookbook-catalog",
        title: "Lookbook Browse",
        summary: "Visual categories first, then larger product cards and curated rows.",
        bestFor: "Apparel and accessories with strong imagery.",
        sectionFocus: "layout",
      },
    ],
  },
  beauty: {
    homepage: [
      {
        id: "beauty-routine-home",
        title: "Routine Builder",
        summary: "Hero, concern-based categories, featured routines, and social proof.",
        bestFor: "Beauty stores selling by concern, routine, or result.",
        sectionFocus: "content",
      },
    ],
    catalog: [
      {
        id: "beauty-concern-catalog",
        title: "Concern-led Browse",
        summary: "Skin concern or product type first, then clean product discovery.",
        bestFor: "Shoppers who need guidance before they choose products.",
        sectionFocus: "pages",
      },
    ],
  },
  electronics: {
    homepage: [
      {
        id: "electronics-spec-home",
        title: "Spec-led Launch",
        summary: "Hero, technical categories, featured products, and timed offer.",
        bestFor: "Gadget stores where shoppers compare quickly.",
        sectionFocus: "layout",
      },
    ],
    catalog: [
      {
        id: "electronics-compare-catalog",
        title: "Compare and Scan",
        summary: "Brand or category path, dense product grid, and filter-ready browsing.",
        bestFor: "Catalogs with lots of technical choice.",
        sectionFocus: "pages",
      },
    ],
  },
  food: {
    homepage: [
      {
        id: "food-menu-home",
        title: "Menu to Order",
        summary: "Cuisine promise, menu categories, popular dishes, and delivery trust.",
        bestFor: "Restaurants or delivery-first food storefronts.",
        sectionFocus: "content",
      },
    ],
    catalog: [
      {
        id: "food-menu-catalog",
        title: "Menu Browse",
        summary: "Category tabs, dish groups, quick add, and delivery cues.",
        bestFor: "Food menus that should feel fast and mobile-friendly.",
        sectionFocus: "pages",
      },
    ],
  },
  crafts: {
    homepage: [
      {
        id: "crafts-heritage-home",
        title: "Heritage Story",
        summary: "Hero, artisan proof, collections, handmade highlights, and trust.",
        bestFor: "Craft brands that sell through story and origin.",
        sectionFocus: "content",
      },
    ],
  },
  landing: {
    homepage: [
      {
        id: "landing-conversion-home",
        title: "Lead Funnel",
        summary: "Hero, trust stats, services, proof, FAQ, and repeated CTA.",
        bestFor: "Service brands, consultants, and growth-focused landing pages.",
        sectionFocus: "layout",
      },
    ],
  },
  service: {
    homepage: [
      {
        id: "service-booking-home",
        title: "Service Booking Home",
        summary: "Outcome-led hero, service categories, packages, testimonials, and booking CTA.",
        bestFor: "Service stores that need lead or appointment conversion.",
        sectionFocus: "pages",
      },
    ],
  },
  booking: {
    homepage: [
      {
        id: "booking-flow-home",
        title: "Availability First",
        summary: "Hero, bookable options, booking steps, policies, and confirmation trust.",
        bestFor: "Reservation-based experiences or spaces.",
        sectionFocus: "pages",
      },
    ],
  },
  hotel: {
    homepage: [
      {
        id: "hotel-stay-home",
        title: "Stay and Book",
        summary: "Destination hero, booking bar, featured rooms, amenities, and reviews.",
        bestFor: "Hospitality storefronts where booking intent is primary.",
        sectionFocus: "pages",
      },
    ],
  },
  "real-estate": {
    homepage: [
      {
        id: "property-lead-home",
        title: "Property Lead Home",
        summary: "Hero, search, listings, neighborhoods, services, and contact CTA.",
        bestFor: "Buy, rent, or management-focused property sites.",
        sectionFocus: "pages",
      },
    ],
  },
  subscriptions: {
    homepage: [
      {
        id: "plan-marketplace-home",
        title: "Plan Marketplace",
        summary: "Hero, plan categories, featured subscriptions, and activation trust.",
        bestFor: "Subscription stores selling plan clarity and fast activation.",
        sectionFocus: "pages",
      },
    ],
  },
  "digital-downloads": {
    homepage: [
      {
        id: "download-market-home",
        title: "Download Marketplace",
        summary: "Hero, categories, featured files, license clarity, and instant-access trust.",
        bestFor: "Digital storefronts where buyers care about formats and access.",
        sectionFocus: "pages",
      },
    ],
  },
};

export function getBasicLayoutVariantOptions(
  templateId: StorefrontTemplateId,
  blockType: StorePageBlock["type"],
): LayoutVariantOption[] {
  const base = baseLayoutVariantOptions[blockType] ?? [];
  const preferredOrder = templateLayoutVariantOrder[templateId]?.[blockType];
  if (!preferredOrder || preferredOrder.length === 0) {
    return base;
  }

  const byId = new Map(base.map((option) => [option.id, option]));
  return preferredOrder
    .map((id) => byId.get(id))
    .filter((option): option is LayoutVariantOption => Boolean(option))
    .map((option, index) => ({
      ...option,
      recommended: index === 0,
    }));
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
  return starterLayoutOverrides[templateId]?.[pageType] ?? defaultStarterLayouts[pageType];
}

export function resolveBasicFlowSections(templateId: StorefrontTemplateId): BasicFlowSectionConfig[] {
  const defaults: Record<BasicFlowSectionId, BasicFlowSectionConfig> = {
    catalog: {
      id: "catalog",
      title: "Shop and Product Detail",
      description: "Guide how shoppers discover products and what product pages should emphasize.",
      visible: true,
    },
    delivery: {
      id: "delivery",
      title: "Cart and Delivery",
      description: "Control delivery fees, zones, and order-fulfillment expectations.",
      visible: true,
    },
    checkout: {
      id: "checkout",
      title: "Checkout and Payment",
      description: "Set how customers pay and how the buying flow should behave.",
      visible: true,
    },
    support: {
      id: "support",
      title: "Account and Support",
      description: "Add the support contact methods that should stay close to the buying journey.",
      visible: true,
    },
  };

  const overrides: Partial<Record<StorefrontTemplateId, Partial<Record<BasicFlowSectionId, Partial<BasicFlowSectionConfig>>>>> = {
    food: {
      delivery: {
        title: "Delivery and Order Zones",
        description: "Keep fee zones and order-fulfillment expectations clear for local ordering.",
      },
      checkout: {
        title: "Checkout and Payment Trust",
      },
    },
    landing: {
      delivery: { visible: false },
      checkout: {
        title: "Lead Conversion Flow",
        description: "Landing templates usually guide visitors into contact, WhatsApp, or a simpler assisted conversion path.",
      },
    },
    "inquiry-catalog": {
      delivery: { visible: false },
      checkout: {
        title: "Inquiry and Quote Flow",
        description: "Wholesale and quote-led catalogs need contact-first conversion more than a standard cart flow.",
      },
    },
    service: {
      delivery: { visible: false },
      checkout: {
        title: "Booking and Lead Flow",
        description: "Service storefronts usually route customers into inquiry, appointment, or assisted checkout paths.",
      },
    },
    booking: {
      delivery: { visible: false },
      checkout: {
        title: "Reservation Flow",
        description: "Booking storefronts need confirmation and payment language that matches reservations instead of shipping.",
      },
    },
    hotel: {
      delivery: { visible: false },
      checkout: {
        title: "Reservation and Deposit Flow",
        description: "Hotel storefronts usually need guest confirmation and deposit expectations instead of delivery settings.",
      },
    },
    "real-estate": {
      delivery: { visible: false },
      checkout: {
        title: "Inquiry and Deposit Flow",
        description: "Property sites usually capture leads or deposits rather than a standard shipped-order checkout.",
      },
    },
    subscriptions: {
      delivery: { visible: false },
      checkout: {
        title: "Subscription Checkout",
        description: "Keep billing and activation messaging aligned with plans, renewals, and account access.",
      },
    },
    "digital-downloads": {
      delivery: { visible: false },
      checkout: {
        title: "Download Purchase Flow",
        description: "Digital storefronts need instant-delivery expectations instead of physical shipping details.",
      },
    },
  };

  const templateOverride = overrides[templateId] ?? {};
  return (Object.keys(defaults) as BasicFlowSectionId[]).map((key) => ({
    ...defaults[key],
    ...(templateOverride[key] ?? {}),
  }));
}

const defaultBlockCoach: Record<StorePageBlock["type"], BasicBlockCoachConfig> = {
  hero: {
    tip: "Lead with one clear promise and one primary action. This section decides whether shoppers keep scrolling.",
    priorityFields: ["title", "subtitle", "ctaText"],
    priorityLabel: "Start here first",
    titleOverrides: {
      title: "Headline",
      subtitle: "Supporting Copy",
      ctaText: "Main Button Text",
      tagline: "Small Label",
    },
  },
  "promo-banner": {
    tip: "Use this for one timely offer only. Too many competing promos make the page feel noisy.",
  },
  "featured-products": {
    tip: "Keep the product count focused. Fewer strong items often sell better than a crowded grid.",
    priorityFields: ["title", "source", "limit"],
    priorityLabel: "Set the product story first",
    titleOverrides: {
      title: "Section Title",
      limit: "Items To Show",
    },
  },
  "recommended-products": {
    tip: "Use this on custom pages, product stories, and support pages when you want a softer recommendation row instead of the main featured catalog.",
    priorityFields: ["title", "source", "limit"],
    priorityLabel: "Set the recommendation mix",
    titleOverrides: {
      title: "Recommendation Title",
      limit: "Products To Show",
    },
  },
  comparison: {
    tip: "Keep comparison focused on a few close alternatives. Too many products weakens the decision.",
    priorityFields: ["title", "source", "limit"],
    priorityLabel: "Frame the buying decision",
    titleOverrides: {
      title: "Comparison Title",
      limit: "Products To Compare",
    },
  },
  "category-showcase": {
    tip: "Use categories to reduce choice overload and help shoppers find the right path quickly.",
    priorityFields: ["title", "source", "limit"],
    priorityLabel: "Guide the browsing path",
    titleOverrides: {
      title: "Section Title",
      tagline: "Small Label",
      limit: "Items To Show",
    },
  },
  "rich-text": {
    tip: "Use short paragraphs or bullets to explain why shoppers should trust this store.",
  },
  countdown: {
    tip: "Use countdowns for real deadlines only. Fake urgency can hurt trust fast.",
  },
  "social-feed": {
    tip: "Show real product-in-use or customer-style photos when possible, not generic decoration.",
  },
  "video-reel": {
    tip: "Use video to demonstrate texture, scale, taste, motion, or proof that photos cannot carry alone.",
  },
  "faq-accordion": {
    tip: "Answer the questions that block purchase: delivery, payment, returns, sizing, and support.",
    priorityFields: ["title", "faqs"],
    priorityLabel: "Cover the buying blockers",
  },
  "trust-badges": {
    tip: "Put practical reassurance here: delivery, payment, exchange, support, and authenticity.",
    priorityFields: ["title", "badges"],
    priorityLabel: "Show the trust signals",
  },
  testimonials: {
    tip: "Specific reviews beat generic praise. Mention product quality, delivery, or support.",
    priorityFields: ["title", "reviews"],
    priorityLabel: "Lead with believable proof",
  },
  "recently-viewed": {
    tip: "This helps returning shoppers pick up where they left off. Keep the title simple.",
  },
};

const blockCoachOverrides: Partial<Record<StorefrontTemplateId, Partial<Record<StorePageBlock["type"], Partial<BasicBlockCoachConfig>>>>> = {
  food: {
    hero: {
      tip: "Lead with the cuisine promise, delivery confidence, and the quickest path to ordering.",
      priorityFields: ["title", "subtitle", "ctaText"],
      titleOverrides: {
        subtitle: "Cuisine and Delivery Copy",
        ctaText: "Order Button Text",
        tagline: "Service Label",
      },
    },
    "featured-products": {
      tip: "Treat this like a menu spotlight. Keep dish count tight and make the offer or cuisine type obvious.",
      priorityFields: ["title", "source", "limit"],
      titleOverrides: {
        title: "Menu Section Title",
        limit: "Dishes To Show",
      },
    },
    "category-showcase": {
      tip: "Use this to guide guests by cuisine, meal type, or dietary path before they feel overwhelmed.",
      priorityFields: ["title", "source", "limit"],
    },
    "trust-badges": {
      tip: "Focus on delivery timing, hygiene, freshness, and order support rather than generic ecommerce claims.",
    },
    testimonials: {
      tip: "Reviews should mention taste, freshness, portion size, speed, or support.",
    },
  },
  electronics: {
    hero: {
      tip: "Lead with the product category, strongest technical value, and one clear shopping action.",
    },
    "featured-products": {
      tip: "Use this section for high-intent gadgets. Make the product grouping feel comparison-friendly, not decorative.",
      priorityFields: ["title", "source", "limit"],
      titleOverrides: {
        title: "Featured Gadgets Title",
      },
    },
    comparison: {
      tip: "Use this for two to four close alternatives. Let shoppers scan the important differences quickly.",
      priorityFields: ["title", "source", "limit"],
      titleOverrides: {
        title: "Comparison Section Title",
        limit: "Devices To Compare",
      },
    },
    "trust-badges": {
      tip: "Focus on warranty, delivery, authenticity, and after-sales support.",
    },
  },
  beauty: {
    hero: {
      tip: "Lead with the routine result, skin concern, or beauty promise shoppers care about most.",
    },
    "featured-products": {
      tip: "Use this to build routines and concern-based discovery, not just a generic product wall.",
      priorityFields: ["title", "source", "limit"],
      titleOverrides: {
        title: "Routine Section Title",
      },
    },
    testimonials: {
      tip: "Use reviews that mention skin feel, results, texture, or repeat purchases.",
    },
  },
  crafts: {
    hero: {
      tip: "Lead with craft story, origin, or handmade trust. The emotional reason to care matters more here.",
    },
    "featured-products": {
      tip: "Highlight fewer handmade pieces and let the story or material do some of the selling.",
      priorityFields: ["title", "source", "limit"],
      titleOverrides: {
        title: "Handmade Collection Title",
      },
    },
  },
  subscriptions: {
    hero: {
      tip: "Lead with the subscription value, who it is for, and the easiest way to compare plan choices.",
    },
    "featured-products": {
      tip: "Use this section to group plans clearly by audience or value, not like a physical product shelf.",
      priorityFields: ["title", "source", "limit"],
      titleOverrides: {
        title: "Plan Section Title",
        limit: "Plans To Show",
      },
    },
    "trust-badges": {
      tip: "Focus on activation speed, renewal clarity, device support, and account confidence.",
    },
  },
  "digital-downloads": {
    hero: {
      tip: "Lead with what buyers get instantly and why these files are worth downloading from you.",
    },
    "featured-products": {
      tip: "Group downloads by asset type, use case, or creator rather than treating them like physical merchandise.",
      priorityFields: ["title", "source", "limit"],
      titleOverrides: {
        title: "Featured Downloads Title",
        limit: "Downloads To Show",
      },
    },
    "trust-badges": {
      tip: "Focus on instant access, license clarity, compatibility, and secure delivery.",
    },
  },
  hotel: {
    hero: {
      tip: "Lead with the stay experience, destination confidence, and the booking action guests should take next.",
      titleOverrides: {
        ctaText: "Booking Button Text",
      },
    },
    "featured-products": {
      tip: "Treat this as a room showcase. Keep the lineup focused and easy to compare at a glance.",
      priorityFields: ["title", "source", "limit"],
      titleOverrides: {
        title: "Room Section Title",
        limit: "Rooms To Show",
      },
    },
  },
  "real-estate": {
    hero: {
      tip: "Lead with location, property intent, and the clearest next step for buyers or renters.",
      titleOverrides: {
        ctaText: "Lead CTA Text",
      },
    },
    "featured-products": {
      tip: "Treat this as a property listing row. Prioritize listing quality over quantity so visitors can scan faster.",
      priorityFields: ["title", "source", "limit"],
      titleOverrides: {
        title: "Listing Section Title",
        limit: "Listings To Show",
      },
    },
  },
  service: {
    hero: {
      tip: "Lead with the service outcome, who it helps, and the fastest way to start an inquiry or booking.",
    },
    "featured-products": {
      tip: "Use this section for services or packages, not like a normal product shelf.",
      priorityFields: ["title", "source", "limit"],
      titleOverrides: {
        title: "Service Section Title",
      },
    },
  },
  booking: {
    hero: {
      tip: "Lead with the bookable experience, who it suits, and the next reservation action.",
    },
  },
  "single-product": {
    hero: {
      tip: "This hero must do most of the conversion work. Focus on one standout promise, one proof point, and one action.",
      titleOverrides: {
        title: "Flagship Product Headline",
        subtitle: "Launch / Preorder Copy",
      },
    },
  },
  "inquiry-catalog": {
    "featured-products": {
      tip: "Treat this like a quote-led product list. Make categories, MOQs, or buyer fit feel obvious before contact.",
      priorityFields: ["title", "source", "limit"],
      titleOverrides: {
        title: "Quote Catalog Section Title",
      },
    },
    "trust-badges": {
      tip: "Focus on MOQ confidence, lead time, production support, customization, and business trust.",
    },
  },
};

export function getBasicBlockCoach(
  templateId: StorefrontTemplateId,
  blockType: StorePageBlock["type"],
): BasicBlockCoachConfig {
  return {
    ...defaultBlockCoach[blockType],
    ...(blockCoachOverrides[templateId]?.[blockType] ?? {}),
    titleOverrides: {
      ...(defaultBlockCoach[blockType].titleOverrides ?? {}),
      ...(blockCoachOverrides[templateId]?.[blockType]?.titleOverrides ?? {}),
    },
  };
}

export function getSharedBlockSuggestionInfo(
  templateId: StorefrontTemplateId,
  blockType: StorePageBlock["type"],
): SharedBlockSuggestionInfo {
  const definition = getStorefrontTemplateDefinition(templateId);
  const seed = getStorefrontTemplateSeedDefinition(templateId);
  const recommended = seed.recommendedBlockSet.includes(blockType);
  const orderedIndex = definition.presentation.sectionOrder.indexOf(blockType);
  const businessFamily = seed.businessFamily;

  const businessFraming: Record<typeof businessFamily, string> = {
    commerce: "This template is tuned for product discovery and buying confidence.",
    booking: "This template is tuned for reservation clarity and action readiness.",
    listing: "This template is tuned for scanning options and reaching out with confidence.",
    service: "This template is tuned for explaining outcomes and nudging inquiry or booking.",
    donation: "This template is tuned for mission clarity and conversion trust.",
  };

  const blockReasons: Partial<Record<StorePageBlock["type"], string>> = {
    hero: "The homepage still lives or dies on the first message, so hero stays the strongest lever here.",
    "promo-banner": businessFamily === "commerce"
      ? "Timed offers and campaign moments usually matter near the top for this storefront type."
      : "This works best when the store needs a short announcement without interrupting the main conversion path.",
    "category-showcase": businessFamily === "commerce" || businessFamily === "listing"
      ? "Visitors often need a cleaner browse path before they are ready to compare individual items."
      : "Use this only when navigation by group or type helps people reach the right offer faster.",
    "featured-products": businessFamily === "service" || businessFamily === "booking"
      ? "This is the main block for packages, services, or bookable offers people need to evaluate next."
      : "This is the main merchandising surface for the offers shoppers should see first.",
    comparison: "Useful when buyers need side-by-side differences before they feel ready to commit.",
    "rich-text": "Helpful when the storefront needs story, policy, or context between harder-selling sections.",
    "social-feed": "Useful when visual proof and real-world usage matter more than polished marketing copy alone.",
    "video-reel": "Useful when motion, texture, walkthroughs, or atmosphere carry meaning that static images miss.",
    "faq-accordion": "Strong when shoppers or guests usually hesitate because of delivery, booking, policy, or support questions.",
    "trust-badges": "Best when reassurance should be skimmed quickly instead of buried inside longer copy.",
    testimonials: "Social proof helps when people want believable evidence before they act.",
    "recommended-products": "This works later in the page when you want softer cross-sell discovery.",
    "recently-viewed": "This matters most for returning visitors who are already comparing or resuming a session.",
  };

  return {
    headline: recommended ? "Recommended for this template" : "Compatible, but more optional here",
    reason: blockReasons[blockType] ?? businessFraming[businessFamily],
    caveat: orderedIndex >= 0
      ? `This template usually places it around section ${orderedIndex + 1} in the homepage story.`
      : recommended
        ? businessFraming[businessFamily]
        : "It can still work well, but it usually needs a clearer reason to earn homepage space.",
    recommended,
  };
}

export function getSharedBlockCopy(templateId: StorefrontTemplateId): SharedBlockCopy {
  switch (templateId) {
    case "food":
      return {
        featuredSourceLabel: "Show Dishes From",
        featuredSourceTitle: "Dish source",
        featuredSourceDescription: "Choose which dishes this section should spotlight. If a menu category is empty, add dishes first.",
        featuredCategoryLabel: "Menu Category",
        featuredTypeLabel: "Menu Type",
        comparisonCategoryLabel: "Category",
        comparisonTypeLabel: "Product Type",
        categorySourceLabel: "Show Menu Navigation For",
        categorySourceTitle: "Menu navigation",
        categorySourceDescription: "Pick the menu path guests should use first: categories, dish types, or an automatic blend.",
        comparisonSourceTitle: "Product source",
        comparisonSourceDescription: "Choose which dishes or offers this comparison should pull from. Keep the set tight so differences stay readable.",
        faqListTitle: "Order questions",
        faqDescription: "Add only the questions that block purchase decisions.",
        faqEmptyText: "Add the questions guests ask before ordering: delivery, payment, spice level, allergens, and support.",
        trustListTitle: "Service trust points",
        trustDescription: "Use practical reassurances, not generic claims.",
        trustEmptyText: "Add practical reassurances: freshness, hygiene, delivery timing, payment, or support.",
        testimonialListTitle: "Guest reviews",
        testimonialDescription: "Specific, believable quotes make this section stronger.",
        testimonialEmptyText: "Add specific reviews that mention taste, freshness, portion size, speed, or support.",
      };
    case "subscriptions":
      return {
        featuredSourceLabel: "Show Plans From",
        featuredSourceTitle: "Plan source",
        featuredSourceDescription: "Choose which plans this section should compare or highlight first.",
        featuredCategoryLabel: "Plan Category",
        featuredTypeLabel: "Account / Plan Type",
        comparisonCategoryLabel: "Category",
        comparisonTypeLabel: "Product Type",
        categorySourceLabel: "Show Plan Navigation For",
        categorySourceTitle: "Plan navigation",
        categorySourceDescription: "Pick the clearest plan discovery path for new buyers.",
        comparisonSourceTitle: "Product source",
        comparisonSourceDescription: "Choose which plans or offers this comparison should pull from. Keep the set tight so differences stay readable.",
        faqListTitle: "Questions",
        faqDescription: "Add only the questions that block purchase decisions.",
        faqEmptyText: "Add the questions shoppers ask before buying: billing, activation, renewal, compatibility, and support.",
        trustListTitle: "Plan trust points",
        trustDescription: "Use practical reassurances, not generic claims.",
        trustEmptyText: "Add practical reassurances: activation speed, renewal clarity, account support, or device compatibility.",
        testimonialListTitle: "Reviews",
        testimonialDescription: "Specific, believable quotes make this section stronger.",
        testimonialEmptyText: "Add specific reviews that mention activation, reliability, support, or repeat renewals.",
      };
    case "hotel":
      return {
        featuredSourceLabel: "Show Rooms From",
        featuredSourceTitle: "Room source",
        featuredSourceDescription: "Choose which room group this section should guide guests toward first.",
        featuredCategoryLabel: "Room Category",
        featuredTypeLabel: "Room Type",
        comparisonCategoryLabel: "Category",
        comparisonTypeLabel: "Product Type",
        categorySourceLabel: "Show Room Navigation For",
        categorySourceTitle: "Room navigation",
        categorySourceDescription: "Pick the room discovery path guests should see first.",
        comparisonSourceTitle: "Product source",
        comparisonSourceDescription: "Choose which rooms or offers this comparison should pull from. Keep the set tight so differences stay readable.",
        faqListTitle: "Guest questions",
        faqDescription: "Add the questions that block inquiry, booking, or first contact.",
        faqEmptyText: "Add the questions guests ask before booking: location, check-in, room details, cancellation, and support.",
        trustListTitle: "Guest confidence points",
        trustDescription: "Use practical reassurances about guest experience, support, and booking confidence.",
        trustEmptyText: "Add practical reassurances: location confidence, guest support, cancellation clarity, or booking trust.",
        testimonialListTitle: "Guest reviews",
        testimonialDescription: "Specific guest comments about stay, location, comfort, or support make this section stronger.",
        testimonialEmptyText: "Add specific reviews that mention stay quality, comfort, staff support, or location.",
      };
    case "real-estate":
      return {
        featuredSourceLabel: "Show Listings From",
        featuredSourceTitle: "Listing source",
        featuredSourceDescription: "Choose which listings this section should surface first for buyers or renters.",
        featuredCategoryLabel: "Property Category",
        featuredTypeLabel: "Listing Type",
        comparisonCategoryLabel: "Category",
        comparisonTypeLabel: "Product Type",
        categorySourceLabel: "Show Listing Navigation For",
        categorySourceTitle: "Listing navigation",
        categorySourceDescription: "Pick the listing navigation style that helps visitors scan faster.",
        comparisonSourceTitle: "Product source",
        comparisonSourceDescription: "Choose which listings or offers this comparison should pull from. Keep the set tight so differences stay readable.",
        faqListTitle: "Buyer and renter questions",
        faqDescription: "Add the questions that block viewings, contact, or listing trust.",
        faqEmptyText: "Add the questions visitors ask before contacting: location, availability, pricing, visits, and support.",
        trustListTitle: "Listing trust points",
        trustDescription: "Use practical reassurances about listings, response, support, and transparency.",
        trustEmptyText: "Add practical reassurances: verified details, responsive support, transparency, or visit coordination.",
        testimonialListTitle: "Buyer and renter reviews",
        testimonialDescription: "Specific, believable quotes make this section stronger.",
        testimonialEmptyText: "Add specific reviews that mention trust, responsiveness, listing clarity, or viewing support.",
      };
    case "inquiry-catalog":
      return {
        featuredSourceLabel: "Show Quote Items From",
        featuredSourceTitle: "Quote source",
        featuredSourceDescription: "Choose which quote-led items this section should push buyers toward first.",
        featuredCategoryLabel: "Buyer Category",
        featuredTypeLabel: "Product Type",
        comparisonCategoryLabel: "Category",
        comparisonTypeLabel: "Product Type",
        categorySourceLabel: "Show Navigation For",
        categorySourceTitle: "Category source",
        categorySourceDescription: "Pick the navigation style shoppers should see in this section.",
        comparisonSourceTitle: "Product source",
        comparisonSourceDescription: "Choose which quote-led items this comparison should pull from. Keep the set tight so differences stay readable.",
        faqListTitle: "Questions",
        faqDescription: "Add only the questions that block purchase decisions.",
        faqEmptyText: "Add the questions buyers ask before contacting: MOQ, lead time, customization, pricing, and support.",
        trustListTitle: "Trust badges",
        trustDescription: "Use practical reassurances, not generic claims.",
        trustEmptyText: "Add practical reassurances: MOQ clarity, lead time, production support, customization, or business trust.",
        testimonialListTitle: "Reviews",
        testimonialDescription: "Specific, believable quotes make this section stronger.",
        testimonialEmptyText: "Add specific reviews that mention reliability, quality, responsiveness, or business support.",
      };
    case "service":
      return {
        featuredSourceLabel: "Show Services From",
        featuredSourceTitle: "Service source",
        featuredSourceDescription: "Choose which services or packages this section should highlight first.",
        featuredCategoryLabel: "Category",
        featuredTypeLabel: "Product Type",
        comparisonCategoryLabel: "Category",
        comparisonTypeLabel: "Product Type",
        categorySourceLabel: "Show Navigation For",
        categorySourceTitle: "Category source",
        categorySourceDescription: "Pick the navigation style shoppers should see in this section.",
        comparisonSourceTitle: "Product source",
        comparisonSourceDescription: "Choose which services or offers this comparison should pull from. Keep the set tight so differences stay readable.",
        faqListTitle: "Service questions",
        faqDescription: "Add the questions that block inquiry, booking, or first contact.",
        faqEmptyText: "Add the questions shoppers ask before reaching out: process, pricing, timelines, revisions, and support.",
        trustListTitle: "Trust badges",
        trustDescription: "Use practical reassurances, not generic claims.",
        trustEmptyText: "Add practical reassurances: response speed, consultation clarity, support, or delivery confidence.",
        testimonialListTitle: "Client reviews",
        testimonialDescription: "Specific, believable quotes about results, support, or experience make this section stronger.",
        testimonialEmptyText: "Add specific reviews that mention results, responsiveness, delivery, or ongoing support.",
      };
    case "electronics":
      return {
        featuredSourceLabel: "Show Products From",
        featuredSourceTitle: "Product source",
        featuredSourceDescription: "Choose which products this section should pull from. If a category or type has no products yet, add products first.",
        featuredCategoryLabel: "Category",
        featuredTypeLabel: "Product Type",
        comparisonCategoryLabel: "Device Category",
        comparisonTypeLabel: "Device Type",
        categorySourceLabel: "Show Navigation For",
        categorySourceTitle: "Category source",
        categorySourceDescription: "Pick the navigation style shoppers should see in this section.",
        comparisonSourceTitle: "Comparison source",
        comparisonSourceDescription: "Choose which products should appear side by side. Keep them close enough that the comparison helps a real decision.",
        faqListTitle: "Questions",
        faqDescription: "Add only the questions that block purchase decisions.",
        faqEmptyText: "Add the questions shoppers ask before buying: warranty, delivery, compatibility, payment, and support.",
        trustListTitle: "Trust badges",
        trustDescription: "Use practical reassurances, not generic claims.",
        trustEmptyText: "Add practical reassurances: warranty, delivery, authenticity, or after-sales support.",
        testimonialListTitle: "Reviews",
        testimonialDescription: "Specific, believable quotes make this section stronger.",
        testimonialEmptyText: "Add specific reviews that mention performance, reliability, delivery, or support.",
      };
    case "beauty":
      return {
        featuredSourceLabel: "Show Products From",
        featuredSourceTitle: "Product source",
        featuredSourceDescription: "Choose which products this section should pull from. If a category or type has no products yet, add products first.",
        featuredCategoryLabel: "Category",
        featuredTypeLabel: "Product Type",
        comparisonCategoryLabel: "Category",
        comparisonTypeLabel: "Product Type",
        categorySourceLabel: "Show Discovery Navigation For",
        categorySourceTitle: "Discovery navigation",
        categorySourceDescription: "Pick whether shoppers should browse by category or product type first.",
        comparisonSourceTitle: "Product source",
        comparisonSourceDescription: "Choose which products this comparison should pull from. Keep the set tight so differences stay readable.",
        faqListTitle: "Questions",
        faqDescription: "Add only the questions that block purchase decisions.",
        faqEmptyText: "Add the questions shoppers ask before buying: skin type, usage, shipping, returns, and support.",
        trustListTitle: "Trust badges",
        trustDescription: "Use practical reassurances, not generic claims.",
        trustEmptyText: "Add practical reassurances: authenticity, routine guidance, delivery, or support.",
        testimonialListTitle: "Reviews",
        testimonialDescription: "Specific, believable quotes make this section stronger.",
        testimonialEmptyText: "Add specific reviews that mention skin feel, results, repeat purchase, or support.",
      };
    default:
      return {
        featuredSourceLabel: "Show Products From",
        featuredSourceTitle: "Product source",
        featuredSourceDescription: "Choose which products this section should pull from. If a category or type has no products yet, add products first.",
        featuredCategoryLabel: "Category",
        featuredTypeLabel: "Product Type",
        comparisonCategoryLabel: "Category",
        comparisonTypeLabel: "Product Type",
        categorySourceLabel: "Show Navigation For",
        categorySourceTitle: "Category source",
        categorySourceDescription: "Pick the navigation style shoppers should see in this section.",
        comparisonSourceTitle: "Product source",
        comparisonSourceDescription: "Choose which products this comparison should pull from. Keep the set tight so differences stay readable.",
        faqListTitle: "Questions",
        faqDescription: "Add only the questions that block purchase decisions.",
        faqEmptyText: "Add the questions shoppers ask before buying: delivery, payment, returns, sizing, and support.",
        trustListTitle: "Trust badges",
        trustDescription: "Use practical reassurances, not generic claims.",
        trustEmptyText: "Add practical reassurances: delivery, payment, exchange, support, or authenticity.",
        testimonialListTitle: "Reviews",
        testimonialDescription: "Specific, believable quotes make this section stronger.",
        testimonialEmptyText: "Add specific reviews that mention product quality, delivery, fit, taste, or support.",
      };
  }
}

export function getSharedFeaturedSourceOptions(templateId: StorefrontTemplateId): SharedSourceOption[] {
  switch (templateId) {
    case "food":
      return [
        { label: "Popular dishes first", value: "featured-or-all" },
        { label: "Bestsellers only", value: "featured" },
        { label: "All live dishes", value: "all" },
        { label: "Newest dishes", value: "newest" },
        { label: "One menu category", value: "category" },
        { label: "One menu type", value: "type" },
      ];
    case "subscriptions":
      return [
        { label: "Best plans first", value: "featured-or-all" },
        { label: "Featured plans only", value: "featured" },
        { label: "All live plans", value: "all" },
        { label: "Newest plans", value: "newest" },
        { label: "One plan category", value: "category" },
        { label: "One account type", value: "type" },
      ];
    case "hotel":
      return [
        { label: "Best rooms first", value: "featured-or-all" },
        { label: "Featured rooms only", value: "featured" },
        { label: "All live rooms", value: "all" },
        { label: "Newest rooms", value: "newest" },
        { label: "One room category", value: "category" },
        { label: "One room type", value: "type" },
      ];
    case "real-estate":
      return [
        { label: "Best listings first", value: "featured-or-all" },
        { label: "Featured listings only", value: "featured" },
        { label: "All live listings", value: "all" },
        { label: "Newest listings", value: "newest" },
        { label: "One property category", value: "category" },
        { label: "One listing type", value: "type" },
      ];
    case "inquiry-catalog":
      return [
        { label: "Most requested items first", value: "featured-or-all" },
        { label: "Quote highlights only", value: "featured" },
        { label: "All live quote items", value: "all" },
        { label: "Newest quote items", value: "newest" },
        { label: "One buyer category", value: "category" },
        { label: "One product type", value: "type" },
      ];
    default:
      return [
        { label: "Featured first, then all products", value: "featured-or-all" },
        { label: "Featured products only", value: "featured" },
        { label: "All available products", value: "all" },
        { label: "Newest products", value: "newest" },
        { label: "One category", value: "category" },
        { label: "One product type", value: "type" },
      ];
  }
}
