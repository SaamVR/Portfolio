import { cmsPageTemplates } from "@/lib/cms/page-templates";
import { fallbackBlockRegistry } from "@/lib/cms/block-registry";
import { fallbackThemePackages } from "@/lib/theme-packages";

export function buildPageTemplateSeedRows() {
  return cmsPageTemplates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    page_payload: template.page,
    is_active: true,
  }));
}

export function buildBlockRegistrySeedRows() {
  return fallbackBlockRegistry.map((entry) => ({
    block_type: entry.value,
    label: entry.label,
    description: entry.description,
    layer: entry.layer,
    compatible_business_families: entry.compatibleBusinessFamilies,
    required_capabilities: entry.requiredCapabilities,
    is_active: true,
  }));
}

export function buildThemePackageSeedRows() {
  return fallbackThemePackages.map((themePackage) => ({
    slug: themePackage.slug,
    name: themePackage.name,
    description: themePackage.description,
    preview_metadata: themePackage.preview,
    source_type: "system",
    version: themePackage.version,
    compatibility_version: themePackage.compatibilityVersion,
    preset_id: themePackage.presetId,
    mode: themePackage.mode,
    tokens: themePackage.tokens,
    component_recipes: themePackage.recipes,
    custom_css: themePackage.customCss ?? null,
    owner_store_id: null,
    is_active: themePackage.isActive,
  }));
}
