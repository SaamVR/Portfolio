import { fallbackStoreBlueprints } from "@/lib/cms/store-blueprints";
import { fallbackPageBlueprints } from "@/lib/cms/page-blueprints";
import { fallbackBlockRegistry } from "@/lib/cms/block-registry";

export type BlueprintRow = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  business_family: string;
  catalog_mode: string;
  group_name: string;
  store_description: string;
  legacy_template_id: string | null;
  recommended_page_set: unknown;
  recommended_block_set: unknown;
  required_capabilities: unknown;
  default_theme: unknown;
  hero_payload: unknown;
  onboarding_schema: unknown;
  default_site_settings: unknown;
  is_active: boolean;
};

export type ThemeRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  source_type: string;
  version: number;
  compatibility_version: number;
  preset_id: string;
  mode: string;
  preview_metadata: unknown;
  tokens: unknown;
  component_recipes: unknown;
  custom_css: string | null;
  owner_store_id: string | null;
  is_active: boolean;
};

export type PageRow = {
  id: string;
  name: string;
  description: string;
  business_family: string;
  catalog_modes: unknown;
  page_payload: unknown;
  is_active: boolean;
};

export type BlockRow = {
  block_type: string;
  label: string;
  description: string;
  layer: string;
  compatible_business_families: unknown;
  required_capabilities: unknown;
  is_active: boolean;
};

export type LibraryData = {
  blueprints: BlueprintRow[];
  themes: ThemeRow[];
  pages: PageRow[];
  blocks: BlockRow[];
};

export type DialogState =
  | { mode: "create" | "edit"; type: "blueprint"; item?: BlueprintRow }
  | { mode: "create" | "edit"; type: "theme"; item?: ThemeRow }
  | { mode: "create" | "edit"; type: "page"; item?: PageRow }
  | { mode: "create" | "edit"; type: "block"; item?: BlockRow }
  | null;

export type FormState = Record<string, string | boolean>;

export type BlueprintDefaultSiteSettings = {
  storefrontProfile: {
    productVisibility: string;
    checkoutMode: string;
  };
  paymentSettings: {
    codEnabled: boolean;
    bkashEnabled: boolean;
    nagadEnabled: boolean;
    prepaidBadgeText: string;
    prepaymentDiscountType: string;
    prepaymentDiscountValue: number;
  };
};

export type ThemeEditorPayload = {
  preview: {
    bg: string;
    primary: string;
    accent: string;
  };
  tokens: {
    light: Record<string, string>;
    dark: Record<string, string>;
    typography: {
      headingFont?: string;
      bodyFont?: string;
    };
    components: {
      borderRadius?: string;
    };
  };
};

export function findBlueprintRowsUsingThemePackage(data: LibraryData, themeId: string) {
  const themeItem = data.themes.find((item) => item.id === themeId);
  const themeIdentifiers = new Set(
    [themeItem?.id, themeItem?.slug]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
  );

  return data.blueprints.filter((item) => {
    const defaultTheme = item.default_theme && typeof item.default_theme === "object" && !Array.isArray(item.default_theme)
      ? item.default_theme as Record<string, unknown>
      : readJsonObject(JSON.stringify(item.default_theme ?? {}));
    const presetId = typeof defaultTheme?.presetId === "string" ? defaultTheme.presetId : null;
    return Boolean(presetId && themeIdentifiers.has(presetId));
  });
}

export const businessFamilyOptions = ["commerce", "booking", "listing", "service"] as const;
export const catalogModeOptions = ["single_product", "multi_product", "menu", "inquiry_only"] as const;
export const legacyTemplateOptions = ["clothing", "food", "general"] as const;
export const blockLayerOptions = ["core", "commerce", "extension"] as const;
export const onboardingStepOptions = ["blueprint", "brand", "content", "catalog", "theme", "payments", "launch"] as const;
export const productVisibilityOptions = ["catalog", "single_product", "menu", "inquiry_only"] as const;
export const checkoutModeOptions = ["standard", "whatsapp", "inquiry"] as const;
export const prepaymentDiscountTypeOptions = ["none", "free_delivery", "percentage", "fixed"] as const;
export const themeSourceTypeOptions = ["system", "admin_shared", "merchant_private", "merchant_submitted"] as const;
export const themeModeOptions = ["light", "dark"] as const;
export function buildKnownPageBlueprintIds(pages: PageRow[] = []) {
  return Array.from(new Set([
    ...fallbackPageBlueprints.map((item) => item.id),
    ...pages.map((item) => item.id),
  ])).sort();
}

export function buildKnownBlockTypes(blocks: BlockRow[] = []) {
  return Array.from(new Set([
    ...fallbackBlockRegistry.map((item) => item.value),
    ...blocks.map((item) => item.block_type),
  ])).sort();
}

export function buildKnownBlockOptions(blocks: BlockRow[] = []) {
  const byType = new Map<string, { value: string; label: string; description: string; layer: string }>();

  for (const item of fallbackBlockRegistry) {
    byType.set(item.value, {
      value: item.value,
      label: item.label,
      description: item.description,
      layer: item.layer,
    });
  }

  for (const item of blocks) {
    byType.set(item.block_type, {
      value: item.block_type,
      label: item.label,
      description: item.description,
      layer: item.layer,
    });
  }

  return Array.from(byType.values()).sort((left, right) => left.label.localeCompare(right.label));
}

export function buildKnownCapabilities(data?: Partial<LibraryData>) {
  const blueprintCapabilities = (data?.blueprints ?? [])
    .flatMap((item) => {
      if (Array.isArray(item.required_capabilities)) {
        return item.required_capabilities.filter((value): value is string => typeof value === "string");
      }

      if (typeof item.required_capabilities === "string") {
        return readStringArray(item.required_capabilities);
      }

      return [];
    });
  const blockCapabilities = (data?.blocks ?? [])
    .flatMap((item) => {
      if (Array.isArray(item.required_capabilities)) {
        return item.required_capabilities.filter((value): value is string => typeof value === "string");
      }

      if (typeof item.required_capabilities === "string") {
        return readStringArray(item.required_capabilities);
      }

      return [];
    });

  return Array.from(new Set([
    ...fallbackStoreBlueprints.flatMap((item) => item.capabilities),
    ...fallbackBlockRegistry.flatMap((item) => item.requiredCapabilities),
    ...blueprintCapabilities,
    ...blockCapabilities,
  ])).sort();
}

export const jsonStringify = (value: unknown, fallback: unknown) => JSON.stringify(value ?? fallback, null, 2);
export const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function parseJsonField(value: string, fieldLabel: string) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${fieldLabel} must be valid JSON.`);
  }
}

export function parseStringArrayField(value: string, fieldLabel: string) {
  const parsed = parseJsonField(value, fieldLabel);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error(`${fieldLabel} must be a JSON string array.`);
  }
  return parsed as string[];
}

export function readStringArray(value: string | boolean | undefined) {
  if (typeof value !== "string") return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writeStringArray(values: string[]) {
  return JSON.stringify(Array.from(new Set(values)).sort(), null, 2);
}

export function readJsonObject(value: string | boolean | undefined) {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function readDefaultSiteSettings(value: string | boolean | undefined): BlueprintDefaultSiteSettings {
  const parsed = readJsonObject(value);
  const storefrontProfile = parsed?.storefront_profile && typeof parsed.storefront_profile === "object"
    ? parsed.storefront_profile as Record<string, unknown>
    : {};
  const paymentSettings = parsed?.payment_settings && typeof parsed.payment_settings === "object"
    ? parsed.payment_settings as Record<string, unknown>
    : {};

  return {
    storefrontProfile: {
      productVisibility: typeof storefrontProfile.product_visibility === "string" ? storefrontProfile.product_visibility : "catalog",
      checkoutMode: typeof storefrontProfile.checkout_mode === "string" ? storefrontProfile.checkout_mode : "standard",
    },
    paymentSettings: {
      codEnabled: typeof paymentSettings.cod_enabled === "boolean" ? paymentSettings.cod_enabled : true,
      bkashEnabled: typeof paymentSettings.bkash_enabled === "boolean" ? paymentSettings.bkash_enabled : false,
      nagadEnabled: typeof paymentSettings.nagad_enabled === "boolean" ? paymentSettings.nagad_enabled : false,
      prepaidBadgeText: typeof paymentSettings.prepaid_badge_text === "string" ? paymentSettings.prepaid_badge_text : "",
      prepaymentDiscountType: typeof paymentSettings.prepayment_discount_type === "string" ? paymentSettings.prepayment_discount_type : "none",
      prepaymentDiscountValue: typeof paymentSettings.prepayment_discount_value === "number" ? paymentSettings.prepayment_discount_value : 0,
    },
  };
}

export function updateDefaultSiteSettingsField(
  existingValue: string | boolean | undefined,
  section: "storefront_profile" | "payment_settings",
  patch: Record<string, unknown>,
) {
  const base = readJsonObject(existingValue) ?? {};
  const currentSection = base[section] && typeof base[section] === "object"
    ? base[section] as Record<string, unknown>
    : {};

  return JSON.stringify({
    ...base,
    [section]: {
      ...currentSection,
      ...patch,
    },
  }, null, 2);
}

export function readThemeEditorPayload(
  previewValue: string | boolean | undefined,
  tokensValue: string | boolean | undefined,
): ThemeEditorPayload {
  const preview = readJsonObject(previewValue);
  const tokens = readJsonObject(tokensValue);
  const typography = tokens?.typography && typeof tokens.typography === "object"
    ? tokens.typography as Record<string, unknown>
    : {};
  const components = tokens?.components && typeof tokens.components === "object"
    ? tokens.components as Record<string, unknown>
    : {};

  return {
    preview: {
      bg: typeof preview?.bg === "string" ? preview.bg : "#0f172a",
      primary: typeof preview?.primary === "string" ? preview.primary : "#22c55e",
      accent: typeof preview?.accent === "string" ? preview.accent : "#38bdf8",
    },
    tokens: {
      light: tokens?.light && typeof tokens.light === "object" ? tokens.light as Record<string, string> : {},
      dark: tokens?.dark && typeof tokens.dark === "object" ? tokens.dark as Record<string, string> : {},
      typography: {
        headingFont: typeof typography.headingFont === "string" ? typography.headingFont : "",
        bodyFont: typeof typography.bodyFont === "string" ? typography.bodyFont : "",
      },
      components: {
        borderRadius: typeof components.borderRadius === "string" ? components.borderRadius : "0.75rem",
      },
    },
  };
}

export function updateThemeJsonField(
  existingValue: string | boolean | undefined,
  patch: Record<string, unknown>,
) {
  return updateObjectJsonField(existingValue, patch);
}

export function readOnboardingSteps(value: string | boolean | undefined) {
  const parsed = readJsonObject(value);
  const steps = Array.isArray(parsed?.steps) ? parsed.steps : [];
  return steps
    .filter((step): step is Record<string, unknown> => Boolean(step && typeof step === "object"))
    .map((step) => ({
      id: typeof step.id === "string" ? step.id : "blueprint",
      title: typeof step.title === "string" ? step.title : "",
      description: typeof step.description === "string" ? step.description : "",
    }));
}

export function writeOnboardingSteps(
  steps: Array<{ id: string; title: string; description: string }>,
  existingValue: string | boolean | undefined,
) {
  const base = readJsonObject(existingValue) ?? {};
  return JSON.stringify({
    ...base,
    steps,
  }, null, 2);
}

export function updateObjectJsonField(
  existingValue: string | boolean | undefined,
  patch: Record<string, unknown>,
) {
  const base = readJsonObject(existingValue) ?? {};
  return JSON.stringify({
    ...base,
    ...patch,
  }, null, 2);
}

export function readPagePayload(value: string | boolean | undefined) {
  const parsed = readJsonObject(value);
  const blocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
  return {
    slug: typeof parsed?.slug === "string" ? parsed.slug : "/page-1",
    title: typeof parsed?.title === "string" ? parsed.title : "Untitled Page",
    seoTitle: typeof parsed?.seoTitle === "string" ? parsed.seoTitle : "",
    seoDescription: typeof parsed?.seoDescription === "string" ? parsed.seoDescription : "",
    isHomepage: typeof parsed?.isHomepage === "boolean" ? parsed.isHomepage : false,
    blocks: blocks.filter((block): block is Record<string, unknown> => Boolean(block && typeof block === "object")),
  };
}

export function updatePagePayloadField(
  existingValue: string | boolean | undefined,
  patch: Record<string, unknown>,
) {
  const current = readPagePayload(existingValue);
  return JSON.stringify({
    ...current,
    ...patch,
  }, null, 2);
}

export function updatePagePayloadBlocks(
  existingValue: string | boolean | undefined,
  blocks: Array<Record<string, unknown>>,
) {
  return updatePagePayloadField(existingValue, { blocks });
}

export function buildBlueprintForm(item?: BlueprintRow): FormState {
  const fallback = fallbackStoreBlueprints.find((entry) => entry.id === item?.id) ?? fallbackStoreBlueprints[0];
  return {
    id: item?.id ?? "",
    name: item?.name ?? "",
    short_name: item?.short_name ?? "",
    description: item?.description ?? fallback.description,
    business_family: item?.business_family ?? fallback.businessFamily,
    catalog_mode: item?.catalog_mode ?? fallback.catalogMode,
    group_name: item?.group_name ?? fallback.group,
    store_description: item?.store_description ?? fallback.storeDescription,
    legacy_template_id: item?.legacy_template_id ?? fallback.legacyTemplateId ?? "general",
    recommended_page_set: jsonStringify(item?.recommended_page_set, fallback.recommendedPageSet),
    recommended_block_set: jsonStringify(item?.recommended_block_set, fallback.recommendedBlockSet),
    required_capabilities: jsonStringify(item?.required_capabilities, fallback.capabilities),
    default_theme: jsonStringify(item?.default_theme, fallback.defaultTheme),
    hero_payload: jsonStringify(item?.hero_payload, fallback.hero),
    onboarding_schema: jsonStringify(item?.onboarding_schema, fallback.onboarding),
    default_site_settings: jsonStringify(item?.default_site_settings, fallback.defaultSiteSettings),
    is_active: item?.is_active ?? true,
  };
}

export function buildPageForm(item?: PageRow): FormState {
  const fallback = fallbackPageBlueprints.find((entry) => entry.id === item?.id) ?? fallbackPageBlueprints[0];
  return {
    id: item?.id ?? "",
    name: item?.name ?? "",
    description: item?.description ?? fallback.description,
    business_family: item?.business_family ?? fallback.businessFamily,
    catalog_modes: jsonStringify(item?.catalog_modes, fallback.catalogModes),
    page_payload: jsonStringify(item?.page_payload, fallback.page),
    is_active: item?.is_active ?? true,
  };
}

export function buildThemeForm(item?: ThemeRow): FormState {
  const fallbackTheme = fallbackStoreBlueprints[0]?.defaultTheme;
  return {
    id: item?.id ?? "",
    slug: item?.slug ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    source_type: item?.source_type ?? "admin_shared",
    version: String(item?.version ?? 1),
    compatibility_version: String(item?.compatibility_version ?? 1),
    preset_id: item?.preset_id ?? fallbackTheme?.presetId ?? "default",
    mode: item?.mode ?? fallbackTheme?.mode ?? "dark",
    preview_metadata: jsonStringify(item?.preview_metadata, { bg: "#0f172a", primary: "#22c55e", accent: "#38bdf8" }),
    tokens: jsonStringify(item?.tokens, {
      light: {},
      dark: {},
      typography: {
        headingFont: fallbackTheme?.headingFont ?? "",
        bodyFont: fallbackTheme?.bodyFont ?? "",
      },
      components: {
        borderRadius: fallbackTheme?.borderRadius ?? "0.75rem",
      },
    }),
    component_recipes: jsonStringify(item?.component_recipes, {}),
    custom_css: item?.custom_css ?? "",
    owner_store_id: item?.owner_store_id ?? "",
    is_active: item?.is_active ?? true,
  };
}

export function buildBlockForm(item?: BlockRow): FormState {
  const fallback = fallbackBlockRegistry.find((entry) => entry.value === item?.block_type) ?? fallbackBlockRegistry[0];
  return {
    block_type: item?.block_type ?? "",
    label: item?.label ?? fallback.label,
    description: item?.description ?? fallback.description,
    layer: item?.layer ?? fallback.layer,
    compatible_business_families: jsonStringify(item?.compatible_business_families, fallback.compatibleBusinessFamilies),
    required_capabilities: jsonStringify(item?.required_capabilities, fallback.requiredCapabilities),
    is_active: item?.is_active ?? true,
  };
}
