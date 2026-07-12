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
  preset_id: string;
  owner_store_id: string | null;
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
  | { mode: "create" | "edit"; type: "page"; item?: PageRow }
  | { mode: "create" | "edit"; type: "block"; item?: BlockRow }
  | null;

export type FormState = Record<string, string | boolean>;

export const businessFamilyOptions = ["commerce", "booking", "listing", "service"] as const;
export const catalogModeOptions = ["single_product", "multi_product", "menu", "inquiry_only"] as const;
export const legacyTemplateOptions = ["clothing", "food", "general"] as const;
export const blockLayerOptions = ["core", "commerce", "extension"] as const;
export const onboardingStepOptions = ["blueprint", "brand", "content", "catalog", "theme", "payments", "launch"] as const;
export const knownPageBlueprintIds = Array.from(new Set(fallbackPageBlueprints.map((item) => item.id)));
export const knownBlockTypes = Array.from(new Set(fallbackBlockRegistry.map((item) => item.value)));
export const knownCapabilities = Array.from(new Set([
  ...fallbackStoreBlueprints.flatMap((item) => item.capabilities),
  ...fallbackBlockRegistry.flatMap((item) => item.requiredCapabilities),
])).sort();

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
