import { launchTemplates, type LaunchTemplateId } from "@/lib/cms/launch-templates";
import type { StorePageBlock, StoreTheme } from "@/lib/cms/schema";
import type { Json } from "@/integrations/supabase/types";

export const storefrontTemplateIds = [
  "blank",
  "landing",
  "beauty",
  "fashion",
  "threads",
  "electronics",
  "food",
  "crafts",
  "subscriptions",
  "digital-downloads",
  "single-product",
  "inquiry-catalog",
  "service",
  "general-catalog",
  "booking",
  "hotel",
  "real-estate",
] as const;

export type StorefrontTemplateId = (typeof storefrontTemplateIds)[number];
export type StorefrontBlockType = StorePageBlock["type"];
export type StorefrontCardStyle =
  | "fashion-editorial"
  | "soft-beauty"
  | "tech-spec"
  | "menu"
  | "handmade"
  | "subscription"
  | "digital-download"
  | "inquiry"
  | "service"
  | "booking"
  | "clean-catalog"
  | "campaign";
export type StorefrontImageRatio = "1:1" | "4:5" | "3:4" | "16:9" | "3:2";
export type StorefrontSpacingDensity = "compact" | "comfortable" | "airy";
export type StorefrontTypographyScale = "compact" | "balanced" | "display";
export type StoreBusinessFamily = "commerce" | "booking" | "listing" | "service" | "donation";
export type StoreCatalogMode = "single_product" | "multi_product" | "menu" | "inquiry_only" | "landing_only" | "digital_download" | "multi_vendor" | "pre_order" | "donation_tiers";
export type OnboardingStepId =
  | "template"
  | "brand"
  | "content"
  | "catalog"
  | "theme"
  | "payments"
  | "launch";
export type StorefrontOnboardingMode = "template" | "blank";

export interface TemplateOnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
}

export type BlueprintOnboardingStep = TemplateOnboardingStep;

export interface StorefrontTemplatePresentation {
  sectionOrder: readonly StorefrontBlockType[];
  visibleSections: readonly StorefrontBlockType[];
  colorTokens: Readonly<Record<string, string>>;
  typographyScale: StorefrontTypographyScale;
  cardStyle: StorefrontCardStyle;
  imageRatio: StorefrontImageRatio;
  borderRadius: string;
  spacingDensity: StorefrontSpacingDensity;
  navigationLabels: Readonly<{
    home: string;
    shop: string;
    account: string;
    wishlist: string;
    cart: string;
  }>;
  ctaLabels: Readonly<{
    primary: string;
    secondary: string;
    addToCart: string;
  }>;
  blockLayoutVariants?: Partial<Record<StorefrontBlockType, string>>;
}

export interface StorefrontTemplateDefinition {
  id: StorefrontTemplateId;
  label: string;
  description: string;
  rendererKind: "fashion" | "threads" | "generic";
  adminOnly?: boolean;
  onboardingMode: StorefrontOnboardingMode;
  compatibleBlockSet: readonly StorefrontBlockType[];
  recommendedBlockSet: readonly StorefrontBlockType[];
  defaultBlockSet: readonly StorefrontBlockType[];
  presentation: StorefrontTemplatePresentation;
  supportsMapControls?: boolean;
  supportsSearchControls?: boolean;
  supportsWishlistControls?: boolean;
  supportsNewsletterControls?: boolean;
  supportsSizeControls?: boolean;
  supportsSaleFilterControls?: boolean;
  supportsPriceFilterControls?: boolean;
  supportsColorControls?: boolean;
}

export interface StorefrontTemplateSeedDefinition {
  id: string;
  legacyBlueprintIds: readonly string[];
  legacyTemplateId?: LaunchTemplateId;
  name: string;
  shortName: string;
  description: string;
  businessFamily: StoreBusinessFamily;
  catalogMode: StoreCatalogMode;
  group: string;
  onboardingMode: StorefrontOnboardingMode;
  recommendedPageSet: string[];
  compatibleBlockSet: string[];
  recommendedBlockSet: string[];
  defaultBlockSet: string[];
  defaultTheme: StoreTheme;
  storeDescription: string;
  hero: {
    tagline: string;
    title: string;
    highlight: string;
    subtitle: string;
  };
  capabilities: string[];
  onboarding: {
    steps: TemplateOnboardingStep[];
  };
  defaultSiteSettings: Record<string, Json>;
}

type StorefrontTemplateDefinitionOverride = {
  label?: string;
  description?: string;
  rendererKind?: StorefrontTemplateDefinition["rendererKind"];
  adminOnly?: boolean;
  onboardingMode?: StorefrontOnboardingMode;
  compatibleBlockSet?: readonly StorefrontBlockType[];
  recommendedBlockSet?: readonly StorefrontBlockType[];
  defaultBlockSet?: readonly StorefrontBlockType[];
  presentation?: Partial<StorefrontTemplatePresentation>;
};

type StorefrontTemplateSeedOverride = Omit<
  StorefrontTemplateSeedDefinition,
  "id" | "defaultSiteSettings" | "onboardingMode" | "compatibleBlockSet" | "defaultBlockSet"
> & {
  onboardingMode?: StorefrontOnboardingMode;
  compatibleBlockSet?: readonly string[];
  defaultBlockSet?: readonly string[];
  storefrontProfile: Record<string, Json>;
};

const allBlockTypes: readonly StorefrontBlockType[] = [
  "countdown",
  "hero",
  "promo-banner",
  "category-showcase",
  "featured-products",
  "comparison",
  "recommended-products",
  "recently-viewed",
  "rich-text",
  "social-feed",
  "video-reel",
  "faq-accordion",
  "trust-badges",
  "testimonials",
] as const;

const defaultOnboardingSteps: TemplateOnboardingStep[] = [
  { id: "template", title: "Template", description: "Pick the storefront template and launch pattern" },
  { id: "brand", title: "Brand", description: "Name, logo, slug, and brand summary" },
  { id: "content", title: "Content", description: "Front-page hero copy and media" },
  { id: "catalog", title: "Catalog", description: "Choose how products and buying work" },
  { id: "theme", title: "Theme", description: "Pick a design package and visual defaults" },
  { id: "payments", title: "Payments", description: "Configure checkout and conversion options" },
  { id: "launch", title: "Launch", description: "Save, publish, and share" },
];

function themeFromLaunchTemplate(id: LaunchTemplateId): StoreTheme {
  const template = launchTemplates.find((item) => item.id === id) ?? launchTemplates[0];
  return {
    ...template.theme,
    customCssVars: { ...template.theme.customCssVars },
  };
}

function paymentSettingsFromLaunchTemplate(id: LaunchTemplateId) {
  const template = launchTemplates.find((item) => item.id === id) ?? launchTemplates[0];
  return {
    cod_enabled: template.paymentDefaults.cod_enabled,
    bkash_enabled: template.paymentDefaults.bkash_enabled,
    nagad_enabled: template.paymentDefaults.nagad_enabled,
    prepaid_badge_text: template.paymentDefaults.prepaid_badge_text,
    prepayment_discount_type: template.paymentDefaults.prepayment_discount_type,
    prepayment_discount_value: template.paymentDefaults.prepayment_discount_value,
  } satisfies Json;
}

function buildTemplateSiteSettings(
  templateId: StorefrontTemplateId,
  storefrontProfile: Record<string, Json>,
  launchTemplateId: LaunchTemplateId,
) {
  return {
    storefront_profile: {
      allow_guest_checkout: true,
      ...storefrontProfile,
      template_id: templateId,
    },
    payment_settings: paymentSettingsFromLaunchTemplate(launchTemplateId),
  } satisfies Record<string, Json>;
}

function createTemplateDefinition(
  id: StorefrontTemplateId,
  overrides: StorefrontTemplateDefinitionOverride,
): StorefrontTemplateDefinition {
  const legacyCompatibleBlockSet = overrides.compatibleBlockSet ?? allBlockTypes;
  const compatibleBlockSet = Array.from(new Set<StorefrontBlockType>([...legacyCompatibleBlockSet, "composition"]));
  const recommendedBlockSet = overrides.recommendedBlockSet ?? legacyCompatibleBlockSet;
  const defaultBlockSet = overrides.defaultBlockSet ?? recommendedBlockSet;

  return {
    id,
    label: overrides.label ?? id,
    description: overrides.description ?? "",
    rendererKind: overrides.rendererKind ?? "generic",
    adminOnly: overrides.adminOnly ?? false,
    onboardingMode: overrides.onboardingMode ?? "template",
    compatibleBlockSet,
    recommendedBlockSet,
    defaultBlockSet,
    presentation: {
      sectionOrder: overrides.presentation?.sectionOrder ?? allBlockTypes,
      visibleSections: overrides.presentation?.visibleSections ?? allBlockTypes,
      colorTokens: overrides.presentation?.colorTokens ?? {},
      typographyScale: overrides.presentation?.typographyScale ?? "balanced",
      cardStyle: overrides.presentation?.cardStyle ?? "clean-catalog",
      imageRatio: overrides.presentation?.imageRatio ?? "4:5",
      borderRadius: overrides.presentation?.borderRadius ?? "1rem",
      spacingDensity: overrides.presentation?.spacingDensity ?? "comfortable",
      navigationLabels: overrides.presentation?.navigationLabels ?? {
        home: "Home",
        shop: "Shop",
        account: "Account",
        wishlist: "Wishlist",
        cart: "Cart",
      },
      ctaLabels: overrides.presentation?.ctaLabels ?? {
        primary: "Explore",
        secondary: "Learn more",
        addToCart: "Add to cart",
      },
      blockLayoutVariants: overrides.presentation?.blockLayoutVariants ?? {},
    },
  };
}

function createTemplateSeedDefinition(
  id: StorefrontTemplateId,
  overrides: StorefrontTemplateSeedOverride,
): StorefrontTemplateSeedDefinition {
  const legacyCompatibleBlockSet = overrides.compatibleBlockSet ?? overrides.recommendedBlockSet;
  const compatibleBlockSet = Array.from(new Set([...legacyCompatibleBlockSet, "composition"]));
  const defaultBlockSet = overrides.defaultBlockSet ?? overrides.recommendedBlockSet;

  return {
    id,
    legacyBlueprintIds: overrides.legacyBlueprintIds,
    legacyTemplateId: overrides.legacyTemplateId,
    name: overrides.name,
    shortName: overrides.shortName,
    description: overrides.description,
    businessFamily: overrides.businessFamily,
    catalogMode: overrides.catalogMode,
    group: overrides.group,
    onboardingMode: overrides.onboardingMode ?? "template",
    recommendedPageSet: [...overrides.recommendedPageSet],
    compatibleBlockSet: [...compatibleBlockSet],
    recommendedBlockSet: [...overrides.recommendedBlockSet],
    defaultBlockSet: [...defaultBlockSet],
    defaultTheme: {
      ...overrides.defaultTheme,
      customCssVars: { ...(overrides.defaultTheme.customCssVars ?? {}) },
    },
    storeDescription: overrides.storeDescription,
    hero: { ...overrides.hero },
    capabilities: [...overrides.capabilities],
    onboarding: {
      steps: overrides.onboarding.steps.map((step) => ({ ...step })),
    },
    defaultSiteSettings: buildTemplateSiteSettings(
      id,
      overrides.storefrontProfile,
      overrides.legacyTemplateId ?? "general",
    ),
  };
}

export const storefrontTemplateRegistry: Record<StorefrontTemplateId, StorefrontTemplateDefinition> = {
  blank: createTemplateDefinition("blank", {
    label: "Blank Builder",
    description: "Start from a minimal storefront shell, then choose the sections and styles you want to launch with.",
    onboardingMode: "blank",
    compatibleBlockSet: allBlockTypes,
    recommendedBlockSet: ["hero", "promo-banner", "category-showcase", "featured-products", "rich-text", "trust-badges", "faq-accordion", "testimonials"],
    defaultBlockSet: ["hero", "featured-products"],
    presentation: {
      sectionOrder: ["hero", "featured-products", "promo-banner", "category-showcase", "rich-text", "trust-badges", "faq-accordion", "testimonials", "social-feed", "video-reel", "comparison", "recommended-products", "recently-viewed", "countdown"],
      visibleSections: ["hero", "featured-products", "promo-banner", "category-showcase", "rich-text", "trust-badges", "faq-accordion", "testimonials", "social-feed", "video-reel", "comparison", "recommended-products", "recently-viewed", "countdown"],
      cardStyle: "clean-catalog",
      imageRatio: "4:5",
      borderRadius: "1rem",
      spacingDensity: "comfortable",
      typographyScale: "balanced",
      navigationLabels: {
        home: "Home",
        shop: "Shop",
        account: "Account",
        wishlist: "Saved",
        cart: "Cart",
      },
      ctaLabels: {
        primary: "Start exploring",
        secondary: "Learn more",
        addToCart: "Add to cart",
      },
      blockLayoutVariants: {
        hero: "split",
        "featured-products": "3-col",
      },
    },
  }),
  landing: createTemplateDefinition("landing", {
    label: "Landing",
    description: "CTA-first single-page flow for direct inquiries and assisted conversion.",
    presentation: {
      sectionOrder: ["hero", "rich-text", "trust-badges", "faq-accordion", "testimonials"],
      visibleSections: ["hero", "rich-text", "trust-badges", "faq-accordion", "testimonials"],
      colorTokens: {
        "--template-surface": "hsla(var(--primary), 0.08)",
      },
      typographyScale: "display",
      cardStyle: "campaign",
      imageRatio: "16:9",
      borderRadius: "1.25rem",
      spacingDensity: "airy",
      navigationLabels: {
        home: "Home",
        shop: "Highlights",
        account: "Account",
        wishlist: "Saved",
        cart: "Cart",
      },
      ctaLabels: {
        primary: "Get started",
        secondary: "Talk to us",
        addToCart: "Continue",
      },
      blockLayoutVariants: {
        hero: "centered",
        "rich-text": "centered",
      },
    },
  }),
  beauty: createTemplateDefinition("beauty", {
    label: "Beauty",
    description: "Soft editorial storefront focused on routines, trust, and polished product storytelling.",
    presentation: {
      cardStyle: "soft-beauty",
      imageRatio: "3:4",
      borderRadius: "1.5rem",
      spacingDensity: "airy",
      typographyScale: "display",
      colorTokens: {
        "--template-accent-soft": "hsla(var(--accent), 0.12)",
      },
      blockLayoutVariants: {
        hero: "split",
        "category-showcase": "carousel",
      },
    },
  }),
  fashion: createTemplateDefinition("fashion", {
    label: "Fashion",
    description: "The current canonical storefront. This path should remain visually unchanged.",
    rendererKind: "fashion",
    presentation: {
      cardStyle: "fashion-editorial",
      imageRatio: "4:5",
      borderRadius: "1rem",
      spacingDensity: "comfortable",
      typographyScale: "display",
      colorTokens: {},
      blockLayoutVariants: {},
    },
  }),
  threads: createTemplateDefinition("threads", {
    label: "Threads",
    description: "Admin-only editorial commerce template with compact storytelling, category-led discovery, and a dark featured-product rail.",
    rendererKind: "threads",
    adminOnly: true,
    recommendedBlockSet: ["hero", "category-showcase", "promo-banner", "recommended-products", "featured-products", "trust-badges", "rich-text"],
    defaultBlockSet: ["hero", "category-showcase", "promo-banner", "recommended-products", "featured-products", "trust-badges", "rich-text"],
    presentation: {
      sectionOrder: ["hero", "category-showcase", "promo-banner", "recommended-products", "featured-products", "trust-badges", "rich-text", "social-feed", "faq-accordion", "testimonials", "comparison", "recently-viewed", "countdown", "video-reel"],
      visibleSections: ["hero", "category-showcase", "promo-banner", "recommended-products", "featured-products", "trust-badges", "rich-text"],
      cardStyle: "fashion-editorial",
      imageRatio: "4:5",
      borderRadius: "0.5rem",
      spacingDensity: "compact",
      typographyScale: "display",
      colorTokens: { "--threads-clay": "17 48% 48%" },
      navigationLabels: { home: "Home", shop: "Shop", account: "Account", wishlist: "Saved", cart: "Cart" },
      ctaLabels: { primary: "Explore New Arrivals", secondary: "Our Story", addToCart: "Add to cart" },
      blockLayoutVariants: {
        hero: "split",
        "category-showcase": "carousel",
        "promo-banner": "dual-editorial",
        "recommended-products": "grid",
        "featured-products": "carousel",
        "trust-badges": "brand-values",
        "rich-text": "brand-story",
      },
    },
  }),
  electronics: createTemplateDefinition("electronics", {
    label: "Electronics",
    description: "Sharper spec-led storefront with denser product comparison rhythm.",
    presentation: {
      cardStyle: "tech-spec",
      imageRatio: "3:2",
      borderRadius: "0.875rem",
      spacingDensity: "compact",
      typographyScale: "balanced",
      blockLayoutVariants: {
        hero: "split",
        "featured-products": "4-col",
        comparison: "tech-spec",
      },
    },
  }),
  food: createTemplateDefinition("food", {
    label: "Food",
    description: "Menu-style storefront geared toward fast browsing and local order confidence.",
    presentation: {
      cardStyle: "menu",
      imageRatio: "1:1",
      borderRadius: "1rem",
      spacingDensity: "compact",
      typographyScale: "balanced",
      blockLayoutVariants: {
        "featured-products": "2-col",
        "category-showcase": "compact-list",
      },
    },
  }),
  crafts: createTemplateDefinition("crafts", {
    label: "Crafts",
    description: "Warmer handcrafted presentation with more storytelling breathing room.",
    presentation: {
      cardStyle: "handmade",
      imageRatio: "4:5",
      borderRadius: "1.5rem",
      spacingDensity: "airy",
      typographyScale: "balanced",
      blockLayoutVariants: {
        hero: "editorial",
      },
    },
  }),
  subscriptions: createTemplateDefinition("subscriptions", {
    label: "Subscriptions",
    description: "Subscription-first storefront for SaaS, streaming, memberships, and digital access offers.",
    presentation: {
      cardStyle: "subscription",
      imageRatio: "1:1",
      borderRadius: "1.25rem",
      spacingDensity: "comfortable",
      typographyScale: "balanced",
      ctaLabels: {
        primary: "Browse subscriptions",
        secondary: "How it works",
        addToCart: "Subscribe now",
      },
      blockLayoutVariants: {
        hero: "split",
        "featured-products": "grid",
      },
    },
  }),
  "digital-downloads": createTemplateDefinition("digital-downloads", {
    label: "Digital Downloads",
    description: "Digital marketplace storefront for downloads, licenses, and fast post-payment access.",
    presentation: {
      cardStyle: "digital-download",
      imageRatio: "1:1",
      borderRadius: "1.25rem",
      spacingDensity: "comfortable",
      typographyScale: "balanced",
      ctaLabels: {
        primary: "Browse downloads",
        secondary: "Explore categories",
        addToCart: "Purchase now",
      },
      blockLayoutVariants: {
        hero: "split",
        "featured-products": "grid",
      },
    },
  }),
  "single-product": createTemplateDefinition("single-product", {
    label: "Single Product",
    description: "Campaign-led storefront centered around one hero offer.",
    presentation: {
      sectionOrder: ["hero", "video-reel", "rich-text", "testimonials", "faq-accordion", "trust-badges"],
      visibleSections: ["hero", "video-reel", "rich-text", "testimonials", "faq-accordion", "trust-badges"],
      cardStyle: "campaign",
      imageRatio: "16:9",
      borderRadius: "1rem",
      spacingDensity: "comfortable",
      typographyScale: "display",
      blockLayoutVariants: {
        hero: "split",
      },
    },
  }),
  "inquiry-catalog": createTemplateDefinition("inquiry-catalog", {
    label: "Inquiry Catalog",
    description: "Browse-first storefront where qualified inquiries matter more than self-serve checkout.",
    presentation: {
      cardStyle: "inquiry",
      imageRatio: "4:5",
      borderRadius: "1rem",
      spacingDensity: "comfortable",
      typographyScale: "balanced",
      ctaLabels: {
        primary: "Request details",
        secondary: "Ask a question",
        addToCart: "Request quote",
      },
    },
  }),
  service: createTemplateDefinition("service", {
    label: "Service",
    description: "Service-led template for offers, packages, and lead capture flows.",
    presentation: {
      cardStyle: "service",
      imageRatio: "16:9",
      borderRadius: "1rem",
      spacingDensity: "comfortable",
      typographyScale: "balanced",
      ctaLabels: {
        primary: "Book a consultation",
        secondary: "See packages",
        addToCart: "Request service",
      },
      blockLayoutVariants: {
        hero: "split",
      },
    },
  }),
  "general-catalog": createTemplateDefinition("general-catalog", {
    label: "General Catalog",
    description: "Flexible default for mixed-product stores and general merchants.",
    presentation: {
      cardStyle: "clean-catalog",
      imageRatio: "4:5",
      borderRadius: "1rem",
      spacingDensity: "comfortable",
      typographyScale: "balanced",
    },
  }),
  booking: createTemplateDefinition("booking", {
    label: "Booking",
    description: "Booking-first storefront for reservations, appointments, and availability-driven conversion.",
    presentation: {
      cardStyle: "booking",
      imageRatio: "16:9",
      borderRadius: "1rem",
      spacingDensity: "airy",
      typographyScale: "balanced",
      ctaLabels: {
        primary: "Book now",
        secondary: "See availability",
        addToCart: "Reserve",
      },
      blockLayoutVariants: {
        hero: "split",
      },
    },
  }),
  hotel: createTemplateDefinition("hotel", {
    label: "Hotel",
    description: "Hospitality-first storefront for stays, rooms, amenities, and reservation-led conversion.",
    presentation: {
      sectionOrder: ["hero", "trust-badges", "category-showcase", "featured-products", "promo-banner", "social-feed", "testimonials", "faq-accordion", "rich-text"],
      visibleSections: ["hero", "trust-badges", "category-showcase", "featured-products", "promo-banner", "social-feed", "testimonials", "faq-accordion", "rich-text"],
      cardStyle: "booking",
      imageRatio: "16:9",
      borderRadius: "1rem",
      spacingDensity: "airy",
      typographyScale: "display",
      ctaLabels: {
        primary: "Book your stay",
        secondary: "View rooms",
        addToCart: "Reserve stay",
      },
      blockLayoutVariants: {
        hero: "split",
      },
    },
  }),
  "real-estate": createTemplateDefinition("real-estate", {
    label: "Real Estate",
    description: "Inquiry-led property storefront for listings, amenities, location trust, and guided lead capture.",
    presentation: {
      sectionOrder: ["hero", "trust-badges", "category-showcase", "featured-products", "rich-text", "promo-banner", "testimonials", "faq-accordion", "social-feed"],
      visibleSections: ["hero", "trust-badges", "category-showcase", "featured-products", "rich-text", "promo-banner", "testimonials", "faq-accordion", "social-feed"],
      cardStyle: "inquiry",
      imageRatio: "16:9",
      borderRadius: "1rem",
      spacingDensity: "airy",
      typographyScale: "balanced",
      ctaLabels: {
        primary: "Schedule a viewing",
        secondary: "Explore listings",
        addToCart: "Request details",
      },
      blockLayoutVariants: {
        hero: "split",
      },
    },
  }),
};

export const storefrontTemplateSeedRegistry: Record<StorefrontTemplateId, StorefrontTemplateSeedDefinition> = {
  blank: createTemplateSeedDefinition("blank", {
    legacyBlueprintIds: ["blank-template", "blank"],
    legacyTemplateId: "general",
    name: "Blank Builder",
    shortName: "Blank",
    description: "A minimal starter shell that lets merchants compose their own homepage from the shared block system.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "Blank Builder",
    onboardingMode: "blank",
    recommendedPageSet: ["home", "about", "policy"],
    compatibleBlockSet: allBlockTypes,
    recommendedBlockSet: ["hero", "promo-banner", "category-showcase", "featured-products", "rich-text", "trust-badges", "faq-accordion", "testimonials"],
    defaultBlockSet: ["hero", "featured-products"],
    defaultTheme: themeFromLaunchTemplate("general"),
    storeDescription: "A custom storefront built from shared sections, reusable layouts, and store-scoped content choices.",
    hero: {
      tagline: "Build your own flow",
      title: "Start from a",
      highlight: "blank canvas",
      subtitle: "Choose the sections you want, keep the shared editor path, and launch without committing to a rigid preset.",
    },
    capabilities: ["catalog", "cart", "checkout"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "catalog",
      checkout_mode: "standard",
    },
  }),
  fashion: createTemplateSeedDefinition("fashion", {
    legacyBlueprintIds: ["clothing"],
    legacyTemplateId: "clothing",
    name: "Fashion Catalog",
    shortName: "Fashion",
    description: "A conversion-ready apparel storefront for drops, collections, styling stories, and frequent launches.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "Clothing",
    recommendedPageSet: ["home", "policy"],
    recommendedBlockSet: ["hero", "promo-banner", "category-showcase", "featured-products", "testimonials", "social-feed", "trust-badges", "faq-accordion", "recently-viewed"],
    defaultTheme: {
      ...themeFromLaunchTemplate("clothing"),
      mode: "light",
      customCssVars: {
        "--background": "43 39% 93%",
        "--foreground": "155 14% 16%",
        "--card": "43 42% 96%",
        "--card-foreground": "155 14% 16%",
        "--popover": "43 42% 96%",
        "--popover-foreground": "155 14% 16%",
        "--primary": "162 75% 24%",
        "--primary-foreground": "43 42% 96%",
        "--secondary": "40 30% 88%",
        "--secondary-foreground": "155 14% 16%",
        "--muted": "40 30% 88%",
        "--muted-foreground": "150 8% 42%",
        "--accent": "155 14% 16%",
        "--accent-foreground": "43 42% 96%",
        "--border": "38 23% 79%",
        "--input": "38 23% 79%",
        "--ring": "162 75% 24%",
      },
    },
    storeDescription: "Premium clothing, curated drops, outfit storytelling, and everyday essentials with strong trust cues and flexible fulfillment options.",
    hero: {
      tagline: "New Season",
      title: "Wear Your",
      highlight: "Identity",
      subtitle: "Launch a fashion storefront with styled hero storytelling, drop-ready merchandising, social proof, and mobile-first checkout.",
    },
    capabilities: ["catalog", "cart", "checkout", "promotions"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "catalog",
      checkout_mode: "standard",
    },
  }),
  threads: createTemplateSeedDefinition("threads", {
    legacyBlueprintIds: ["threads-admin"],
    legacyTemplateId: "clothing",
    name: "Threads Editorial",
    shortName: "Threads",
    description: "Admin-only compact editorial storefront built around story-led merchandising and mobile-first product discovery.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "Clothing",
    recommendedPageSet: ["home", "about", "policy"],
    recommendedBlockSet: ["hero", "category-showcase", "promo-banner", "recommended-products", "featured-products", "trust-badges", "rich-text"],
    defaultBlockSet: ["hero", "category-showcase", "promo-banner", "recommended-products", "featured-products", "trust-badges", "rich-text"],
    defaultTheme: {
      ...themeFromLaunchTemplate("clothing"),
      mode: "light",
      aesthetic: "editorial",
      borderRadius: "0.5rem",
      sectionSpacing: "compact",
      customCssVars: {
        "--background": "42 38% 97%",
        "--foreground": "165 26% 12%",
        "--card": "42 42% 99%",
        "--card-foreground": "165 26% 12%",
        "--popover": "42 42% 99%",
        "--popover-foreground": "165 26% 12%",
        "--primary": "160 58% 18%",
        "--primary-foreground": "42 42% 99%",
        "--secondary": "38 31% 91%",
        "--secondary-foreground": "165 26% 12%",
        "--muted": "36 23% 84%",
        "--muted-foreground": "158 10% 36%",
        "--accent": "17 48% 48%",
        "--accent-foreground": "42 42% 99%",
        "--border": "35 20% 82%",
        "--input": "35 20% 82%",
        "--ring": "160 58% 18%",
        "--threads-clay": "17 48% 48%"
      }
    },
    storeDescription: "An editorial apparel and lifestyle storefront with compact category discovery, product storytelling, and a deep-green featured rail.",
    hero: {
      tagline: "Wear Your Story",
      title: "Wear Your Story",
      highlight: "",
      subtitle: "Art, culture and everyday pieces made to carry a story."
    },
    capabilities: ["catalog", "cart", "checkout", "promotions"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: { product_visibility: "catalog", checkout_mode: "standard" }
  }),
  beauty: createTemplateSeedDefinition("beauty", {
    legacyBlueprintIds: ["beauty"],
    legacyTemplateId: "clothing",
    name: "Beauty Storefront",
    shortName: "Beauty",
    description: "A polished beauty storefront focused on routines, bundles, trust, and repeatable merchandising.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "Beauty / Wellness",
    recommendedPageSet: ["home", "about", "policy"],
    recommendedBlockSet: ["hero", "category-showcase", "featured-products", "promo-banner", "trust-badges", "testimonials", "faq-accordion", "recently-viewed"],
    defaultTheme: {
      presetId: "soft-beauty",
      mode: "light",
      aesthetic: "editorial",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Playfair Display', serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "1.5rem",
      customCssVars: {},
    },
    storeDescription: "Skin, hair, makeup, and self-care products presented with routine-focused storytelling, trust cues, and polished bundle merchandising.",
    hero: {
      tagline: "Daily Ritual",
      title: "Build Your",
      highlight: "Glow Routine",
      subtitle: "Launch a beauty storefront with swatch-friendly merchandising, softer trust sections, and bundle-led discovery.",
    },
    capabilities: ["catalog", "cart", "checkout", "bundles", "reviews"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "catalog",
      checkout_mode: "standard",
    },
  }),
  electronics: createTemplateSeedDefinition("electronics", {
    legacyBlueprintIds: ["gadgets"],
    legacyTemplateId: "gadgets",
    name: "Gadgets & Electronics",
    shortName: "Gadgets",
    description: "A sharper electronics storefront for devices, accessories, bundles, specs, and feature-led launches.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "Electronics / Gadgets",
    recommendedPageSet: ["home", "about", "policy"],
    recommendedBlockSet: ["hero", "promo-banner", "featured-products", "comparison", "video-reel", "rich-text", "faq-accordion", "trust-badges", "testimonials", "recently-viewed"],
    defaultTheme: {
      presetId: "midnight-blue",
      mode: "dark",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    storeDescription: "Smart devices, practical accessories, spec-led merchandising, demo media, and purchase-confidence messaging for modern buyers.",
    hero: {
      tagline: "Engineered for Everyday",
      title: "Gear Up with",
      highlight: "Better Tech",
      subtitle: "Show specs, bundles, demo media, and confident trust signals without inheriting placeholder fashion copy.",
    },
    capabilities: ["catalog", "cart", "checkout", "specs"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "catalog",
      checkout_mode: "standard",
    },
  }),
  food: createTemplateSeedDefinition("food", {
    legacyBlueprintIds: ["food"],
    legacyTemplateId: "food",
    name: "Food & Menu",
    shortName: "Food",
    description: "A menu-style storefront for daily specials, bakery drops, meal boxes, subscriptions, and local ordering.",
    businessFamily: "commerce",
    catalogMode: "menu",
    group: "Food / Menu",
    recommendedPageSet: ["home", "about-kitchen"],
    recommendedBlockSet: ["hero", "promo-banner", "featured-products", "social-feed", "rich-text", "faq-accordion", "trust-badges", "testimonials"],
    defaultTheme: themeFromLaunchTemplate("food"),
    storeDescription: "Fresh food, bakery bestsellers, daily specials, kitchen trust cues, and local-order confidence built into the buying flow.",
    hero: {
      tagline: "Fresh Today",
      title: "Homemade",
      highlight: "Goodness",
      subtitle: "Sell meals, bakery items, and daily specials with sharper appetite cues, timing hooks, and fast ordering.",
    },
    capabilities: ["catalog", "cart", "local_delivery"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "menu",
      checkout_mode: "standard",
    },
  }),
  crafts: createTemplateSeedDefinition("crafts", {
    legacyBlueprintIds: ["crafts"],
    legacyTemplateId: "crafts",
    name: "Crafts & Handmade",
    shortName: "Crafts",
    description: "A warmer story-led storefront for handmade goods, gifts, commissions, small-batch collections, and custom orders.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "Crafts / Handmade",
    recommendedPageSet: ["home", "about", "policy"],
    recommendedBlockSet: ["hero", "promo-banner", "featured-products", "rich-text", "social-feed", "testimonials", "trust-badges", "faq-accordion"],
    defaultTheme: {
      presetId: "warm-earth",
      mode: "light",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "1rem",
      customCssVars: {},
    },
    storeDescription: "Handmade collections, limited batches, maker stories, commission-friendly FAQs, and gift-ready merchandising for independent brands.",
    hero: {
      tagline: "Made with Care",
      title: "Bring Handmade",
      highlight: "Closer",
      subtitle: "Present process, craft, and product details in a way that feels personal, giftable, and worth trusting.",
    },
    capabilities: ["catalog", "cart", "checkout", "storytelling"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "catalog",
      checkout_mode: "standard",
    },
  }),
  "single-product": createTemplateSeedDefinition("single-product", {
    legacyBlueprintIds: ["single-product"],
    legacyTemplateId: "general",
    name: "Single Product Launch",
    shortName: "Single Product",
    description: "A focused launch flow for one flagship item, bundle, preorder, or campaign-led hero product with stronger persuasion pacing.",
    businessFamily: "commerce",
    catalogMode: "single_product",
    group: "Single Product",
    recommendedPageSet: ["home", "policy"],
    recommendedBlockSet: ["hero", "promo-banner", "video-reel", "rich-text", "faq-accordion", "testimonials", "trust-badges", "social-feed"],
    defaultTheme: {
      presetId: "ocean-teal",
      mode: "dark",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    storeDescription: "A focused storefront designed to sell one hero product with demo media, proof, and a tighter conversion path.",
    hero: {
      tagline: "One Product, One Story",
      title: "Launch Your",
      highlight: "Flagship",
      subtitle: "Keep attention on the core offer with demo-first storytelling, a tighter structure, and a clearer CTA flow.",
    },
    capabilities: ["single_product", "cart", "checkout", "campaigns"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "single_product",
      checkout_mode: "standard",
    },
  }),
  "inquiry-catalog": createTemplateSeedDefinition("inquiry-catalog", {
    legacyBlueprintIds: ["inquiry-catalog"],
    legacyTemplateId: "general",
    name: "Inquiry-Led Catalog",
    shortName: "Inquiry",
    description: "A browse-only catalog for quote-based or assisted selling, with hidden prices, proof sections, FAQs, and stronger lead capture cues.",
    businessFamily: "commerce",
    catalogMode: "inquiry_only",
    group: "Inquiry / Browse Only",
    recommendedPageSet: ["home", "about", "contact"],
    recommendedBlockSet: ["hero", "promo-banner", "featured-products", "rich-text", "faq-accordion", "testimonials", "trust-badges", "social-feed"],
    defaultTheme: {
      presetId: "royal-purple",
      mode: "light",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    storeDescription: "Show products, services, or collections without forcing direct checkout, and convert interest into more qualified conversations.",
    hero: {
      tagline: "Talk Before They Buy",
      title: "Turn Browsing into",
      highlight: "Qualified Leads",
      subtitle: "Ideal for custom orders, higher-ticket products, or cases where proof and conversation come before price and checkout.",
    },
    capabilities: ["catalog", "inquiry_only", "lead_capture"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "inquiry_only",
      checkout_mode: "whatsapp",
      hide_prices: true,
    },
  }),
  subscriptions: createTemplateSeedDefinition("subscriptions", {
    legacyBlueprintIds: ["subscriptions", "subscription", "subscription-marketplace"],
    legacyTemplateId: "general",
    name: "Subscription Marketplace",
    shortName: "Subscriptions",
    description: "A storefront for subscriptions, memberships, premium access products, and recurring digital-value offers.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "Subscriptions",
    recommendedPageSet: ["home", "about", "policy"],
    recommendedBlockSet: ["hero", "promo-banner", "category-showcase", "featured-products", "trust-badges", "rich-text", "testimonials", "faq-accordion"],
    defaultTheme: {
      presetId: "emerald-fresh",
      mode: "light",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "1.25rem",
      customCssVars: {},
    },
    storeDescription: "Subscriptions, memberships, premium access products, and recurring-value digital offers with clearer trust and plan selection.",
    hero: {
      tagline: "Premium Access",
      title: "Your Subscription",
      highlight: "Hub",
      subtitle: "Launch a subscription-first storefront that helps customers compare plans, billing durations, and activation expectations without leaving the shared commerce stack.",
    },
    capabilities: ["catalog", "cart", "checkout", "subscriptions"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "catalog",
      checkout_mode: "standard",
      hide_prices: false,
    },
  }),
  "digital-downloads": createTemplateSeedDefinition("digital-downloads", {
    legacyBlueprintIds: ["digital-downloads", "digital-download", "digital-products", "downloads"],
    legacyTemplateId: "general",
    name: "Digital Downloads",
    shortName: "Digital",
    description: "A storefront for downloadable files, templates, assets, presets, fonts, and licensed digital products.",
    businessFamily: "commerce",
    catalogMode: "digital_download",
    group: "Digital Products",
    recommendedPageSet: ["home", "about", "policy"],
    recommendedBlockSet: ["hero", "promo-banner", "category-showcase", "featured-products", "trust-badges", "rich-text", "testimonials", "faq-accordion"],
    defaultTheme: {
      presetId: "emerald-fresh",
      mode: "light",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "1.25rem",
      customCssVars: {},
    },
    storeDescription: "Downloadable products, licensed assets, templates, presets, and digital resources sold through the shared storefront and checkout stack.",
    hero: {
      tagline: "Instant digital delivery",
      title: "Sell premium",
      highlight: "digital products",
      subtitle: "Launch a storefront for downloads, templates, assets, and licensed products without losing the shared cart, checkout, and storefront controls.",
    },
    capabilities: ["catalog", "cart", "checkout", "digital_downloads"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "catalog",
      checkout_mode: "standard",
      hide_prices: false,
    },
  }),
  service: createTemplateSeedDefinition("service", {
    legacyBlueprintIds: ["service"],
    legacyTemplateId: "general",
    name: "Service Storefront",
    shortName: "Service",
    description: "A service-led storefront for offers, packages, consultations, and lead capture journeys.",
    businessFamily: "service",
    catalogMode: "inquiry_only",
    group: "Services",
    recommendedPageSet: ["home", "about", "contact"],
    recommendedBlockSet: ["hero", "rich-text", "testimonials", "faq-accordion", "trust-badges"],
    defaultTheme: {
      presetId: "royal-purple",
      mode: "light",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "1rem",
      customCssVars: {},
    },
    storeDescription: "Packages, consultations, and service offers with trust-building content and inquiry-first conversion paths.",
    hero: {
      tagline: "Expert Support",
      title: "Turn Visits into",
      highlight: "Booked Consultations",
      subtitle: "Start from a service-first storefront that highlights packages, credibility, and strong inquiry capture without forcing a cart flow.",
    },
    capabilities: ["lead_capture", "packages", "service_inquiries"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "inquiry_only",
      checkout_mode: "whatsapp",
      hide_prices: false,
    },
  }),
  "general-catalog": createTemplateSeedDefinition("general-catalog", {
    legacyBlueprintIds: ["general-catalog", "general"],
    legacyTemplateId: "general",
    name: "General Catalog",
    shortName: "Catalog",
    description: "A flexible default for mixed-product stores that need a polished, conversion-ready starting point with better discovery and trust rhythm.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "General Catalog",
    recommendedPageSet: ["home", "about", "policy"],
    recommendedBlockSet: ["hero", "promo-banner", "category-showcase", "featured-products", "rich-text", "faq-accordion", "social-feed", "trust-badges", "testimonials", "recently-viewed"],
    defaultTheme: themeFromLaunchTemplate("general"),
    storeDescription: "A flexible storefront for products, bundles, promotions, everyday ecommerce operations, and more trustworthy first-purchase pacing.",
    hero: {
      tagline: "Built to Adapt",
      title: "Create a Store That",
      highlight: "Fits You",
      subtitle: "Start from a neutral but sellable catalog structure with better discovery, trust cues, and room to adapt.",
    },
    capabilities: ["catalog", "cart", "checkout"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "catalog",
      checkout_mode: "standard",
    },
  }),
  landing: createTemplateSeedDefinition("landing", {
    legacyBlueprintIds: ["landing-page"],
    legacyTemplateId: "general",
    name: "Landing Page Launch",
    shortName: "Landing Page",
    description: "A single-page, WhatsApp/CTA-driven promotional landing page with no cart or checkout flow.",
    businessFamily: "commerce",
    catalogMode: "landing_only",
    group: "Landing Page",
    recommendedPageSet: ["home"],
    recommendedBlockSet: ["hero", "rich-text", "trust-badges", "faq-accordion"],
    defaultTheme: {
      presetId: "midnight-blue",
      mode: "dark",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    storeDescription: "A focused promotional landing page designed to drive WhatsApp orders and direct inquiries.",
    hero: {
      tagline: "Direct Order",
      title: "Connect & Order",
      highlight: "on WhatsApp",
      subtitle: "A focused landing page built to drive direct inquiries, WhatsApp orders, and instant customer conversion without extra checkout steps.",
    },
    capabilities: ["landing_page", "lead_capture", "whatsapp_order"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "landing_only",
      checkout_mode: "whatsapp",
      hide_prices: false,
    },
  }),
  booking: createTemplateSeedDefinition("booking", {
    legacyBlueprintIds: ["booking"],
    legacyTemplateId: "general",
    name: "Booking Storefront",
    shortName: "Booking",
    description: "A booking-first storefront for reservations, appointments, schedules, and availability-driven conversion.",
    businessFamily: "booking",
    catalogMode: "inquiry_only",
    group: "Booking / Appointments",
    recommendedPageSet: ["home", "about", "contact"],
    recommendedBlockSet: ["hero", "rich-text", "testimonials", "faq-accordion", "trust-badges"],
    defaultTheme: {
      presetId: "ocean-teal",
      mode: "light",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "1rem",
      customCssVars: {},
    },
    storeDescription: "Appointments, reservations, and availability-led offers with clearer credibility, timing, and inquiry handoff.",
    hero: {
      tagline: "Reserve with Confidence",
      title: "Make Booking",
      highlight: "Feel Effortless",
      subtitle: "Launch a booking-first storefront that highlights availability, trust, and a smoother path from discovery into reservation requests.",
    },
    capabilities: ["booking_requests", "lead_capture", "availability"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "inquiry_only",
      checkout_mode: "whatsapp",
      hide_prices: false,
    },
  }),
  hotel: createTemplateSeedDefinition("hotel", {
    legacyBlueprintIds: ["hotel", "hospitality"],
    legacyTemplateId: "general",
    name: "Hotel Storefront",
    shortName: "Hotel",
    description: "A hospitality storefront for rooms, amenities, stays, and reservation-led guest conversion.",
    businessFamily: "booking",
    catalogMode: "inquiry_only",
    group: "Hotels / Hospitality",
    recommendedPageSet: ["home", "about", "contact"],
    recommendedBlockSet: ["hero", "rich-text", "testimonials", "faq-accordion", "trust-badges"],
    defaultTheme: {
      presetId: "ocean-teal",
      mode: "light",
      aesthetic: "editorial",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Playfair Display', serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "1rem",
      customCssVars: {},
    },
    storeDescription: "Rooms, suites, amenities, and stay experiences presented with trust-building content and a smoother reservation path.",
    hero: {
      tagline: "Stay with Confidence",
      title: "Turn Discovery into",
      highlight: "Confirmed Stays",
      subtitle: "Launch a hospitality storefront that highlights rooms, amenities, guest trust, and direct reservation inquiries without splitting away from the shared system.",
    },
    capabilities: ["booking_requests", "lead_capture", "availability", "hospitality"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "inquiry_only",
      checkout_mode: "whatsapp",
      hide_prices: false,
    },
  }),
  "real-estate": createTemplateSeedDefinition("real-estate", {
    legacyBlueprintIds: ["real-estate", "property-listings"],
    legacyTemplateId: "general",
    name: "Real Estate Listings",
    shortName: "Real Estate",
    description: "A property-led storefront for listings, location proof, amenities, and qualified viewing inquiries.",
    businessFamily: "listing",
    catalogMode: "inquiry_only",
    group: "Real Estate / Listings",
    recommendedPageSet: ["home", "about", "contact"],
    recommendedBlockSet: ["hero", "featured-products", "rich-text", "faq-accordion", "testimonials", "trust-badges"],
    defaultTheme: {
      presetId: "midnight-blue",
      mode: "light",
      aesthetic: "minimal",
      effects: { scrollReveals: true, hoverEffects: true, parallax: false, intensity: "subtle" },
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "1rem",
      customCssVars: {},
    },
    storeDescription: "Property listings, neighborhood trust cues, amenity highlights, and inquiry-driven conversion for buyers or tenants.",
    hero: {
      tagline: "Explore Smarter",
      title: "Present Properties with",
      highlight: "Trust",
      subtitle: "Use the shared storefront system to showcase listings, amenities, and viewing inquiries without hardcoded one-off flows.",
    },
    capabilities: ["lead_capture", "listing_catalog", "viewing_requests"],
    onboarding: { steps: defaultOnboardingSteps },
    storefrontProfile: {
      product_visibility: "inquiry_only",
      checkout_mode: "whatsapp",
      hide_prices: true,
    },
  }),
};

export const storefrontTemplateSeedDefinitions = storefrontTemplateIds.map((id) => storefrontTemplateSeedRegistry[id]);

const storefrontTemplateBlueprintAliasMap = storefrontTemplateSeedDefinitions.reduce<Record<string, StorefrontTemplateId>>((accumulator, definition) => {
  const templateId = definition.id as StorefrontTemplateId;
  accumulator[definition.id] = templateId;
  for (const alias of definition.legacyBlueprintIds) {
    accumulator[alias] = templateId;
  }
  return accumulator;
}, {});

export const storefrontTemplateOptions = storefrontTemplateIds.map((id) => ({
  value: id,
  label: storefrontTemplateRegistry[id].label,
  description: storefrontTemplateRegistry[id].description,
  onboardingMode: storefrontTemplateRegistry[id].onboardingMode,
  adminOnly: storefrontTemplateRegistry[id].adminOnly === true,
}));

export function isStorefrontTemplateId(value: unknown): value is StorefrontTemplateId {
  return typeof value === "string" && value in storefrontTemplateRegistry;
}

export function getStorefrontTemplateDefinition(templateId: StorefrontTemplateId) {
  return storefrontTemplateRegistry[templateId];
}

export function getStorefrontTemplateSeedDefinition(templateId: StorefrontTemplateId) {
  return storefrontTemplateSeedRegistry[templateId];
}

export type ResolvedStorefrontTemplateProfile = {
  templateId: StorefrontTemplateId;
  seedDefinition: StorefrontTemplateSeedDefinition;
  businessFamily: StoreBusinessFamily;
  catalogMode: StoreCatalogMode;
  templateSeedId: string;
};

export function resolveCompatibleTemplateSeedId(
  candidate: unknown,
  options?: {
    productVisibility?: string | null;
  },
): StorefrontTemplateId | null {
  if (candidate === "general") {
    switch (options?.productVisibility) {
      case "landing_only":
        return "landing";
      case "single_product":
        return "single-product";
      case "inquiry_only":
        return "inquiry-catalog";
      default:
        return "general-catalog";
    }
  }

  if (isStorefrontTemplateId(candidate)) {
    return candidate;
  }

  if (typeof candidate === "string" && storefrontTemplateBlueprintAliasMap[candidate]) {
    return storefrontTemplateBlueprintAliasMap[candidate];
  }

  return null;
}

export function resolveStorefrontTemplateId(
  candidate: unknown,
  options?: {
    templateSeedId?: string | null;
    productVisibility?: string | null;
  },
): StorefrontTemplateId {
  const directMatch = resolveCompatibleTemplateSeedId(candidate, {
    productVisibility: options?.productVisibility ?? null,
  });
  if (directMatch) {
    return directMatch;
  }

  const templateSeedMatch = resolveCompatibleTemplateSeedId(options?.templateSeedId, {
    productVisibility: options?.productVisibility ?? null,
  });
  if (templateSeedMatch) {
    return templateSeedMatch;
  }

  switch (options?.productVisibility) {
    case "landing_only":
      return "landing";
    case "single_product":
      return "single-product";
    case "inquiry_only":
      return "inquiry-catalog";
    case "menu":
      return "food";
    default:
      return "general-catalog";
  }
}

export function resolveStorefrontTemplateProfile(
  candidate: unknown,
  options?: {
    templateSeedId?: string | null;
    productVisibility?: string | null;
  },
): ResolvedStorefrontTemplateProfile {
  const templateId = resolveStorefrontTemplateId(candidate, options);
  const seedDefinition = getStorefrontTemplateSeedDefinition(templateId);

  return {
    templateId,
    seedDefinition,
    businessFamily: seedDefinition.businessFamily,
    catalogMode: seedDefinition.catalogMode,
    templateSeedId: seedDefinition.id,
  };
}

export function buildStorefrontTemplateSiteSettingsEntries(
  template: Pick<StorefrontTemplateSeedDefinition, "defaultSiteSettings">,
  overrides: Record<string, Json> = {},
) {
  const mergedSettings = {
    ...template.defaultSiteSettings,
    ...overrides,
  };

  return Object.entries(mergedSettings).map(([key, value]) => ({
    key,
    value,
  }));
}
