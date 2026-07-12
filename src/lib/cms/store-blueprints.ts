import { launchTemplates, type LaunchTemplateId } from "@/lib/cms/launch-templates";
import type { StoreTheme } from "@/lib/cms/schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

export type StoreBusinessFamily = "commerce" | "booking" | "listing" | "service";
export type StoreCatalogMode = "single_product" | "multi_product" | "menu" | "inquiry_only";
export type OnboardingStepId =
  | "blueprint"
  | "brand"
  | "content"
  | "catalog"
  | "theme"
  | "payments"
  | "launch";

export interface BlueprintOnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
}

export interface StoreBlueprintDefinition {
  id: string;
  legacyTemplateId?: LaunchTemplateId;
  name: string;
  shortName: string;
  description: string;
  businessFamily: StoreBusinessFamily;
  catalogMode: StoreCatalogMode;
  group: string;
  recommendedPageSet: string[];
  recommendedBlockSet: string[];
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
    steps: BlueprintOnboardingStep[];
  };
  defaultSiteSettings: Record<string, Json>;
}

const defaultOnboardingSteps: BlueprintOnboardingStep[] = [
  { id: "blueprint", title: "Blueprint", description: "Pick the site style and launch pattern" },
  { id: "brand", title: "Brand", description: "Name, logo, slug, and brand summary" },
  { id: "content", title: "Content", description: "Front-page hero copy and media" },
  { id: "catalog", title: "Catalog", description: "Choose how products and buying work" },
  { id: "theme", title: "Theme", description: "Pick a design package and visual defaults" },
  { id: "payments", title: "Payments", description: "Configure checkout and conversion options" },
  { id: "launch", title: "Launch", description: "Save, publish, and share" },
];

function themeFromTemplate(id: LaunchTemplateId): StoreTheme {
  const template = launchTemplates.find((item) => item.id === id) ?? launchTemplates[0];
  return {
    ...template.theme,
    customCssVars: { ...template.theme.customCssVars },
  };
}

export const fallbackStoreBlueprints: StoreBlueprintDefinition[] = [
  {
    id: "clothing",
    legacyTemplateId: "clothing",
    name: "Fashion Catalog",
    shortName: "Fashion",
    description: "A modern apparel storefront for drops, collections, and frequent launches.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "Clothing",
    recommendedPageSet: ["home", "policy"],
    recommendedBlockSet: ["hero", "promo-banner", "category-showcase", "featured-products", "faq-accordion", "social-feed"],
    defaultTheme: themeFromTemplate("clothing"),
    storeDescription: "Premium clothing, curated drops, and everyday essentials with fast local delivery.",
    hero: {
      tagline: "New Season",
      title: "Wear Your",
      highlight: "Identity",
      subtitle: "Launch your clothing store with curated drops, premium product sections, and mobile-first checkout.",
    },
    capabilities: ["catalog", "cart", "checkout", "promotions"],
    onboarding: { steps: defaultOnboardingSteps },
    defaultSiteSettings: {
      storefront_profile: {
        product_visibility: "catalog",
        checkout_mode: "standard",
      },
    },
  },
  {
    id: "gadgets",
    legacyTemplateId: "general",
    name: "Gadgets & Electronics",
    shortName: "Gadgets",
    description: "A sharper catalog setup for devices, accessories, bundles, and feature-led launches.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "Electronics / Gadgets",
    recommendedPageSet: ["home", "about", "policy"],
    recommendedBlockSet: ["hero", "featured-products", "rich-text", "faq-accordion", "trust-badges"],
    defaultTheme: {
      presetId: "midnight-blue",
      mode: "dark",
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    storeDescription: "Smart devices, practical accessories, and clear feature-focused merchandising for modern buyers.",
    hero: {
      tagline: "Engineered for Everyday",
      title: "Gear Up with",
      highlight: "Better Tech",
      subtitle: "Show features, bundles, and confident trust signals without inheriting fashion-first placeholder copy.",
    },
    capabilities: ["catalog", "cart", "checkout", "specs"],
    onboarding: { steps: defaultOnboardingSteps },
    defaultSiteSettings: {
      storefront_profile: {
        product_visibility: "catalog",
        checkout_mode: "standard",
      },
    },
  },
  {
    id: "crafts",
    legacyTemplateId: "general",
    name: "Crafts & Handmade",
    shortName: "Crafts",
    description: "A warmer product-led storefront for handmade goods, gifts, and small-batch collections.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "Crafts / Handmade",
    recommendedPageSet: ["home", "about", "policy"],
    recommendedBlockSet: ["hero", "featured-products", "rich-text", "social-feed", "testimonials"],
    defaultTheme: {
      presetId: "warm-earth",
      mode: "light",
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "1rem",
      customCssVars: {},
    },
    storeDescription: "Handmade collections, limited batches, and story-rich product presentation for independent makers.",
    hero: {
      tagline: "Made with Care",
      title: "Bring Handmade",
      highlight: "Closer",
      subtitle: "Present process, story, and product details in a way that feels personal instead of generic.",
    },
    capabilities: ["catalog", "cart", "checkout", "storytelling"],
    onboarding: { steps: defaultOnboardingSteps },
    defaultSiteSettings: {
      storefront_profile: {
        product_visibility: "catalog",
        checkout_mode: "standard",
      },
    },
  },
  {
    id: "food",
    legacyTemplateId: "food",
    name: "Food & Menu",
    shortName: "Food",
    description: "A menu-style storefront for daily specials, meal boxes, bakery items, and local ordering.",
    businessFamily: "commerce",
    catalogMode: "menu",
    group: "Food / Menu",
    recommendedPageSet: ["home", "about-kitchen"],
    recommendedBlockSet: ["hero", "promo-banner", "featured-products", "rich-text", "faq-accordion"],
    defaultTheme: themeFromTemplate("food"),
    storeDescription: "Fresh food, meal boxes, bakery items, and local delivery made simple.",
    hero: {
      tagline: "Fresh Today",
      title: "Homemade",
      highlight: "Goodness",
      subtitle: "Sell meals, bakery items, and daily specials with a simple storefront built for local orders.",
    },
    capabilities: ["catalog", "cart", "local_delivery"],
    onboarding: { steps: defaultOnboardingSteps },
    defaultSiteSettings: {
      storefront_profile: {
        product_visibility: "menu",
        checkout_mode: "standard",
      },
    },
  },
  {
    id: "single-product",
    legacyTemplateId: "general",
    name: "Single Product Launch",
    shortName: "Single Product",
    description: "A focused launch flow for one flagship item, bundle, or preorder.",
    businessFamily: "commerce",
    catalogMode: "single_product",
    group: "Single Product",
    recommendedPageSet: ["home", "policy"],
    recommendedBlockSet: ["hero", "promo-banner", "rich-text", "faq-accordion", "testimonials"],
    defaultTheme: {
      presetId: "ocean-teal",
      mode: "dark",
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    storeDescription: "A focused storefront designed to sell one hero product with a tighter story and stronger conversion path.",
    hero: {
      tagline: "One Product, One Story",
      title: "Launch Your",
      highlight: "Flagship",
      subtitle: "Keep attention on the core offer with a tighter structure, smaller catalog, and clearer CTA flow.",
    },
    capabilities: ["single_product", "cart", "checkout", "campaigns"],
    onboarding: { steps: defaultOnboardingSteps },
    defaultSiteSettings: {
      storefront_profile: {
        product_visibility: "single_product",
        checkout_mode: "standard",
      },
    },
  },
  {
    id: "general-catalog",
    legacyTemplateId: "general",
    name: "General Catalog",
    shortName: "Catalog",
    description: "A flexible default for mixed-product stores that need a clean starting point.",
    businessFamily: "commerce",
    catalogMode: "multi_product",
    group: "General Catalog",
    recommendedPageSet: ["home", "about", "policy"],
    recommendedBlockSet: ["hero", "featured-products", "rich-text", "faq-accordion", "trust-badges"],
    defaultTheme: themeFromTemplate("general"),
    storeDescription: "A flexible storefront for products, bundles, promotions, and everyday ecommerce operations.",
    hero: {
      tagline: "Built to Adapt",
      title: "Create a Store That",
      highlight: "Fits You",
      subtitle: "Start from a neutral catalog structure and make the storefront yours without category-biased defaults.",
    },
    capabilities: ["catalog", "cart", "checkout"],
    onboarding: { steps: defaultOnboardingSteps },
    defaultSiteSettings: {
      storefront_profile: {
        product_visibility: "catalog",
        checkout_mode: "standard",
      },
    },
  },
  {
    id: "inquiry-catalog",
    legacyTemplateId: "general",
    name: "Inquiry-Led Catalog",
    shortName: "Inquiry",
    description: "A browse-only catalog for quote-based or assisted selling, with hidden prices and lead capture.",
    businessFamily: "commerce",
    catalogMode: "inquiry_only",
    group: "Inquiry / Browse Only",
    recommendedPageSet: ["home", "about", "contact"],
    recommendedBlockSet: ["hero", "featured-products", "rich-text", "faq-accordion", "trust-badges"],
    defaultTheme: {
      presetId: "royal-purple",
      mode: "light",
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Inter', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    storeDescription: "Show products, services, or collections without forcing direct checkout, and convert interest into conversations.",
    hero: {
      tagline: "Talk Before They Buy",
      title: "Turn Browsing into",
      highlight: "Qualified Leads",
      subtitle: "Ideal for custom orders, higher-ticket products, or cases where inquiry comes before price and checkout.",
    },
    capabilities: ["catalog", "inquiry_only", "lead_capture"],
    onboarding: { steps: defaultOnboardingSteps },
    defaultSiteSettings: {
      storefront_profile: {
        product_visibility: "inquiry_only",
        checkout_mode: "whatsapp",
        hide_prices: true,
      },
    },
  },
];

export function getStoreBlueprintById(id: string | null | undefined): StoreBlueprintDefinition {
  return fallbackStoreBlueprints.find((item) => item.id === id)
    ?? fallbackStoreBlueprints.find((item) => item.legacyTemplateId === id)
    ?? fallbackStoreBlueprints[0];
}

export function getStoreBlueprintGroups(blueprints: StoreBlueprintDefinition[]) {
  return blueprints.reduce<Record<string, StoreBlueprintDefinition[]>>((accumulator, blueprint) => {
    if (!accumulator[blueprint.group]) {
      accumulator[blueprint.group] = [];
    }

    accumulator[blueprint.group].push(blueprint);
    return accumulator;
  }, {});
}

type StoreBlueprintRow = {
  id: string;
  legacy_template_id?: string | null;
  name: string;
  short_name?: string | null;
  description?: string | null;
  business_family?: string | null;
  catalog_mode?: string | null;
  group_name?: string | null;
  recommended_page_set?: Json | null;
  recommended_block_set?: Json | null;
  default_theme?: Json | null;
  store_description?: string | null;
  hero_payload?: Json | null;
  required_capabilities?: Json | null;
  onboarding_schema?: Json | null;
  default_site_settings?: Json | null;
  is_active?: boolean | null;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function mergeBlueprintRow(row: StoreBlueprintRow): StoreBlueprintDefinition {
  const fallback = getStoreBlueprintById(row.id);
  const onboardingSchema = row.onboarding_schema as { steps?: BlueprintOnboardingStep[] } | null;
  const defaultTheme = (row.default_theme ?? fallback.defaultTheme) as StoreTheme;
  const heroPayload = row.hero_payload as Partial<StoreBlueprintDefinition["hero"]> | null;

  return {
    ...fallback,
    id: row.id,
    legacyTemplateId: typeof row.legacy_template_id === "string" ? (row.legacy_template_id as LaunchTemplateId) : fallback.legacyTemplateId,
    name: row.name,
    shortName: row.short_name ?? fallback.shortName,
    description: row.description ?? fallback.description,
    businessFamily: (row.business_family as StoreBusinessFamily | null) ?? fallback.businessFamily,
    catalogMode: (row.catalog_mode as StoreCatalogMode | null) ?? fallback.catalogMode,
    group: row.group_name ?? fallback.group,
    recommendedPageSet: isStringArray(row.recommended_page_set) ? row.recommended_page_set : fallback.recommendedPageSet,
    recommendedBlockSet: isStringArray(row.recommended_block_set) ? row.recommended_block_set : fallback.recommendedBlockSet,
    defaultTheme: {
      ...fallback.defaultTheme,
      ...defaultTheme,
      customCssVars: {
        ...fallback.defaultTheme.customCssVars,
        ...(defaultTheme?.customCssVars ?? {}),
      },
    },
    storeDescription: row.store_description ?? fallback.storeDescription,
    hero: {
      ...fallback.hero,
      ...(heroPayload ?? {}),
    },
    capabilities: isStringArray(row.required_capabilities) ? row.required_capabilities : fallback.capabilities,
    onboarding: {
      steps: onboardingSchema?.steps?.length ? onboardingSchema.steps : fallback.onboarding.steps,
    },
    defaultSiteSettings: typeof row.default_site_settings === "object" && row.default_site_settings
      ? (row.default_site_settings as Record<string, Json>)
      : fallback.defaultSiteSettings,
  };
}

export async function loadStoreBlueprints(
  client: SupabaseClient<Database> | SupabaseClient<any>,
): Promise<StoreBlueprintDefinition[]> {
  const { data, error } = await (client as any)
    .from("store_blueprints")
    .select([
      "id",
      "legacy_template_id",
      "name",
      "short_name",
      "description",
      "business_family",
      "catalog_mode",
      "group_name",
      "recommended_page_set",
      "recommended_block_set",
      "default_theme",
      "store_description",
      "hero_payload",
      "required_capabilities",
      "onboarding_schema",
      "default_site_settings",
      "is_active",
    ].join(","))
    .eq("is_active", true)
    .order("name");

  if (error || !Array.isArray(data) || data.length === 0) {
    return fallbackStoreBlueprints;
  }

  return data.map((row: StoreBlueprintRow) => mergeBlueprintRow(row));
}
