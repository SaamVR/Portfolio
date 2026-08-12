import { cmsPageTemplates } from "@/lib/cms/page-templates";
import { fallbackBlockRegistry } from "@/lib/cms/block-registry";
import { allStoreBusinessFamilies, allStoreCatalogModes, storefrontProductVisibilityModes } from "@/lib/cms/storefront-compat";
import { storefrontTemplateSeedDefinitions } from "@/lib/cms/storefront-templates";

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
  themes: ThemeRow[];
  pages?: PageRow[];
  blocks: BlockRow[];
};

export type DialogState =
  | { mode: "create" | "edit"; type: "theme"; item?: ThemeRow }
  | { mode: "create" | "edit"; type: "page"; item?: PageRow }
  | { mode: "create" | "edit"; type: "block"; item?: BlockRow }
  | null;

export type FormState = Record<string, string | boolean>;

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

export const businessFamilyOptions = allStoreBusinessFamilies;
export const catalogModeOptions = allStoreCatalogModes;
export const legacyTemplateOptions = ["clothing", "food", "general", "landing", "gadgets", "crafts"] as const;
export const blockLayerOptions = ["core", "commerce", "extension"] as const;
export const onboardingStepOptions = ["template", "brand", "content", "catalog", "theme", "payments", "launch"] as const;
export const productVisibilityOptions = storefrontProductVisibilityModes;
export const checkoutModeOptions = ["standard", "whatsapp", "inquiry"] as const;
export const prepaymentDiscountTypeOptions = ["none", "free_delivery", "percentage", "fixed"] as const;
export const themeSourceTypeOptions = ["system", "admin_shared", "merchant_private", "merchant_submitted"] as const;
export const themeModeOptions = ["light", "dark"] as const;
export function buildKnownPageTemplateIds(pages: PageRow[] = []) {
  return Array.from(new Set([
    ...cmsPageTemplates.map((item) => item.id),
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
    ...storefrontTemplateSeedDefinitions.flatMap((item) => item.capabilities),
    ...fallbackBlockRegistry.flatMap((item) => item.requiredCapabilities),
    ...blockCapabilities,
  ])).sort();
}

const jsonStringify = (value: unknown, fallback: unknown) => JSON.stringify(value ?? fallback, null, 2);
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

function readJsonObject(value: string | boolean | undefined) {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
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

function updateObjectJsonField(
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

export function buildPageForm(item?: PageRow): FormState {
  const fallback = cmsPageTemplates.find((entry) => entry.id === item?.id) ?? cmsPageTemplates[0];
  return {
    id: item?.id ?? "",
    name: item?.name ?? "",
    description: item?.description ?? fallback.description,
    page_payload: jsonStringify(item?.page_payload, fallback.page),
    is_active: item?.is_active ?? true,
  };
}

export function buildThemeForm(item?: ThemeRow): FormState {
  const fallbackTheme = storefrontTemplateSeedDefinitions[0]?.defaultTheme;
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
