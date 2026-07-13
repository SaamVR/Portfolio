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

function paymentSettingsFromTemplate(id: LaunchTemplateId) {
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

function buildDefaultSiteSettings(
  templateId: LaunchTemplateId,
  storefrontProfile: Record<string, Json>,
) {
  return {
    storefront_profile: storefrontProfile,
    payment_settings: paymentSettingsFromTemplate(templateId),
  } satisfies Record<string, Json>;
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
    storeDescription: "Premium clothing, curated drops, and everyday essentials with flexible fulfillment options.",
    hero: {
      tagline: "New Season",
      title: "Wear Your",
      highlight: "Identity",
      subtitle: "Launch your clothing store with curated drops, premium product sections, and mobile-first checkout.",
    },
    capabilities: ["catalog", "cart", "checkout", "promotions"],
    onboarding: { steps: defaultOnboardingSteps },
    defaultSiteSettings: buildDefaultSiteSettings("clothing", {
        product_visibility: "catalog",
        checkout_mode: "standard",
      }),
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
    defaultSiteSettings: buildDefaultSiteSettings("general", {
        product_visibility: "catalog",
        checkout_mode: "standard",
      }),
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
    defaultSiteSettings: buildDefaultSiteSettings("general", {
        product_visibility: "catalog",
        checkout_mode: "standard",
      }),
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
    storeDescription: "Fresh food, meal boxes, bakery items, and convenient ordering made simple.",
    hero: {
      tagline: "Fresh Today",
      title: "Homemade",
      highlight: "Goodness",
      subtitle: "Sell meals, bakery items, and daily specials with a simple storefront built for fast ordering.",
    },
    capabilities: ["catalog", "cart", "local_delivery"],
    onboarding: { steps: defaultOnboardingSteps },
    defaultSiteSettings: buildDefaultSiteSettings("food", {
        product_visibility: "menu",
        checkout_mode: "standard",
      }),
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
    defaultSiteSettings: buildDefaultSiteSettings("general", {
        product_visibility: "single_product",
        checkout_mode: "standard",
      }),
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
    defaultSiteSettings: buildDefaultSiteSettings("general", {
        product_visibility: "catalog",
        checkout_mode: "standard",
      }),
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
    defaultSiteSettings: buildDefaultSiteSettings("general", {
        product_visibility: "inquiry_only",
        checkout_mode: "whatsapp",
        hide_prices: true,
      }),
  },
];

export function findStoreBlueprintById(
  id: string | null | undefined,
  blueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints,
): StoreBlueprintDefinition | undefined {
  return blueprints.find((item) => item.id === id)
    ?? blueprints.find((item) => item.legacyTemplateId === id);
}

export function getStoreBlueprintById(id: string | null | undefined): StoreBlueprintDefinition {
  return findStoreBlueprintById(id, fallbackStoreBlueprints)
    ?? fallbackStoreBlueprints[0];
}

export function resolveStoreBlueprint(
  id: string | null | undefined,
  blueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints,
): StoreBlueprintDefinition {
  return findStoreBlueprintById(id, blueprints)
    ?? findStoreBlueprintById("general-catalog", blueprints)
    ?? getStoreBlueprintById(id)
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

export function buildBlueprintSiteSettingsEntries(
  blueprint: StoreBlueprintDefinition,
  overrides: Record<string, Json> = {},
) {
  const mergedSettings = {
    ...blueprint.defaultSiteSettings,
    ...overrides,
  };

  return Object.entries(mergedSettings).map(([key, value]) => ({
    key,
    value,
  }));
}

export type StoreBlueprintRow = {
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

function mergeBlueprintSiteSettings(
  fallbackSettings: Record<string, Json>,
  incomingSettings: Json | null | undefined,
) {
  if (!incomingSettings || typeof incomingSettings !== "object" || Array.isArray(incomingSettings)) {
    return fallbackSettings;
  }

  const incoming = incomingSettings as Record<string, Json>;
  const merged: Record<string, Json> = {
    ...fallbackSettings,
  };

  for (const [key, value] of Object.entries(incoming)) {
    if (
      value
      && typeof value === "object"
      && !Array.isArray(value)
      && merged[key]
      && typeof merged[key] === "object"
      && !Array.isArray(merged[key])
    ) {
      merged[key] = {
        ...(merged[key] as Record<string, Json>),
        ...(value as Record<string, Json>),
      };
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

export function buildBlueprintDefinitionFromRow(row: StoreBlueprintRow): StoreBlueprintDefinition {
  const fallback = findStoreBlueprintById(row.id, fallbackStoreBlueprints)
    ?? findStoreBlueprintById(row.legacy_template_id, fallbackStoreBlueprints)
    ?? findStoreBlueprintById("general-catalog", fallbackStoreBlueprints)
    ?? fallbackStoreBlueprints[0];
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
    defaultSiteSettings: mergeBlueprintSiteSettings(fallback.defaultSiteSettings, row.default_site_settings),
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
    .order("name");

  if (error || !Array.isArray(data) || data.length === 0) {
    return fallbackStoreBlueprints;
  }

  const inactiveIds = new Set(
    data
      .filter((row: StoreBlueprintRow) => row.is_active === false)
      .map((row: StoreBlueprintRow) => row.id),
  );
  const mergedRows = data
    .filter((row: StoreBlueprintRow) => row.is_active !== false)
    .map((row: StoreBlueprintRow) => buildBlueprintDefinitionFromRow(row));
  const byId = new Map<string, StoreBlueprintDefinition>();

  for (const blueprint of mergedRows) {
    byId.set(blueprint.id, blueprint);
  }

  for (const fallback of fallbackStoreBlueprints) {
    if (inactiveIds.has(fallback.id) || byId.has(fallback.id)) continue;
    byId.set(fallback.id, fallback);
  }

  return Array.from(byId.values());
}

export async function loadStoreBlueprintById(
  client: SupabaseClient<Database> | SupabaseClient<any>,
  blueprintId: string | null | undefined,
): Promise<StoreBlueprintDefinition | null> {
  if (!blueprintId) {
    return null;
  }

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
    .eq("id", blueprintId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return buildBlueprintDefinitionFromRow(data as StoreBlueprintRow);
}
