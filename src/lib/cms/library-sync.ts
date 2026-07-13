import { fallbackStoreBlueprints } from "@/lib/cms/store-blueprints";
import { fallbackPageBlueprints } from "@/lib/cms/page-blueprints";
import { fallbackBlockRegistry } from "@/lib/cms/block-registry";
import { fallbackThemePackages } from "@/lib/theme-packages";

export function buildStoreBlueprintSeedRows() {
  return fallbackStoreBlueprints.map((blueprint) => ({
    id: blueprint.id,
    legacy_template_id: blueprint.legacyTemplateId ?? null,
    name: blueprint.name,
    short_name: blueprint.shortName,
    description: blueprint.description,
    business_family: blueprint.businessFamily,
    catalog_mode: blueprint.catalogMode,
    group_name: blueprint.group,
    recommended_page_set: blueprint.recommendedPageSet,
    recommended_block_set: blueprint.recommendedBlockSet,
    default_theme: blueprint.defaultTheme,
    store_description: blueprint.storeDescription,
    hero_payload: blueprint.hero,
    required_capabilities: blueprint.capabilities,
    onboarding_schema: blueprint.onboarding,
    default_site_settings: blueprint.defaultSiteSettings,
    is_active: true,
  }));
}

export function buildPageBlueprintSeedRows() {
  return fallbackPageBlueprints.map((blueprint) => ({
    id: blueprint.id,
    name: blueprint.name,
    description: blueprint.description,
    business_family: blueprint.businessFamily,
    catalog_modes: blueprint.catalogModes,
    page_payload: blueprint.page,
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
