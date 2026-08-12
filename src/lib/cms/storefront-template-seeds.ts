import type { LaunchTemplateId } from "@/lib/cms/launch-templates";
import type { StoreTheme } from "@/lib/cms/schema";
import {
  buildStorefrontTemplateSiteSettingsEntries,
  resolveCompatibleTemplateSeedId,
  storefrontTemplateSeedDefinitions,
  type BlueprintOnboardingStep,
  type StoreBusinessFamily,
  type StoreCatalogMode,
  type StorefrontTemplateSeedDefinition as BaseStorefrontTemplateSeedDefinition,
} from "@/lib/cms/storefront-templates";
import type { Json } from "@/integrations/supabase/types";
export type { StoreBusinessFamily, StoreCatalogMode, BlueprintOnboardingStep } from "@/lib/cms/storefront-templates";

export interface StorefrontTemplateSeedDefinition extends Omit<BaseStorefrontTemplateSeedDefinition, "legacyBlueprintIds"> {
  schemaVersion?: number;
}

function cloneTemplateSeedDefinition(definition: BaseStorefrontTemplateSeedDefinition): StorefrontTemplateSeedDefinition {
  return {
    ...definition,
    recommendedPageSet: [...definition.recommendedPageSet],
    compatibleBlockSet: [...definition.compatibleBlockSet],
    recommendedBlockSet: [...definition.recommendedBlockSet],
    defaultBlockSet: [...definition.defaultBlockSet],
    defaultTheme: {
      ...definition.defaultTheme,
      customCssVars: { ...(definition.defaultTheme.customCssVars ?? {}) },
    } as StoreTheme,
    hero: { ...definition.hero },
    capabilities: [...definition.capabilities],
    onboarding: {
      steps: definition.onboarding.steps.map((step) => ({ ...step })),
    },
    defaultSiteSettings: Object.fromEntries(
      buildStorefrontTemplateSiteSettingsEntries(definition).map((entry) => [entry.key, entry.value]),
    ),
  };
}

export const fallbackStorefrontTemplateSeeds: StorefrontTemplateSeedDefinition[] = storefrontTemplateSeedDefinitions.map(cloneTemplateSeedDefinition);

export function findStorefrontTemplateSeedById(
  id: string | null | undefined,
  templateSeeds: StorefrontTemplateSeedDefinition[] = fallbackStorefrontTemplateSeeds,
): StorefrontTemplateSeedDefinition | undefined {
  const normalizedTemplateId = resolveCompatibleTemplateSeedId(id ?? null);

  return templateSeeds.find((item) => item.id === normalizedTemplateId)
    ?? templateSeeds.find((item) => item.id === id)
    ?? templateSeeds.find((item) => item.legacyTemplateId === id);
}

export function getStorefrontTemplateSeedById(id: string | null | undefined): StorefrontTemplateSeedDefinition {
  return findStorefrontTemplateSeedById(id, fallbackStorefrontTemplateSeeds)
    ?? fallbackStorefrontTemplateSeeds[0];
}

export function resolveStorefrontTemplateSeed(
  id: string | null | undefined,
  templateSeeds: StorefrontTemplateSeedDefinition[] = fallbackStorefrontTemplateSeeds,
): StorefrontTemplateSeedDefinition {
  return findStorefrontTemplateSeedById(id, templateSeeds)
    ?? findStorefrontTemplateSeedById("general-catalog", templateSeeds)
    ?? getStorefrontTemplateSeedById(id)
    ?? fallbackStorefrontTemplateSeeds[0];
}

export function getStorefrontTemplateSeedGroups(templateSeeds: StorefrontTemplateSeedDefinition[]) {
  return templateSeeds.reduce<Record<string, StorefrontTemplateSeedDefinition[]>>((accumulator, templateSeed) => {
    if (!accumulator[templateSeed.group]) {
      accumulator[templateSeed.group] = [];
    }

    accumulator[templateSeed.group].push(templateSeed);
    return accumulator;
  }, {});
}

export function buildTemplateSeedSiteSettingsEntries(
  templateSeed: StorefrontTemplateSeedDefinition,
  overrides: Record<string, Json> = {},
) {
  return buildStorefrontTemplateSiteSettingsEntries(templateSeed, overrides);
}

export type StorefrontTemplateSeedRow = {
  id: string;
  legacy_template_id?: string | null;
  name: string;
  short_name?: string | null;
  description?: string | null;
  business_family?: string | null;
  catalog_mode?: string | null;
  group_name?: string | null;
  recommended_page_set?: Json | null;
  compatible_block_set?: Json | null;
  recommended_block_set?: Json | null;
  default_block_set?: Json | null;
  default_theme?: Json | null;
  store_description?: string | null;
  hero_payload?: Json | null;
  required_capabilities?: Json | null;
  onboarding_schema?: Json | null;
  default_site_settings?: Json | null;
  schema_version?: number | null;
  is_active?: boolean | null;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function mergeTemplateSeedSiteSettings(
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

export function buildTemplateSeedDefinitionFromRow(row: StorefrontTemplateSeedRow): StorefrontTemplateSeedDefinition {
  const fallback = findStorefrontTemplateSeedById(row.id, fallbackStorefrontTemplateSeeds)
    ?? findStorefrontTemplateSeedById(row.legacy_template_id, fallbackStorefrontTemplateSeeds)
    ?? findStorefrontTemplateSeedById("general-catalog", fallbackStorefrontTemplateSeeds)
    ?? fallbackStorefrontTemplateSeeds[0];
  const onboardingSchema = row.onboarding_schema as { steps?: BlueprintOnboardingStep[] } | null;
  const defaultTheme = (row.default_theme ?? fallback.defaultTheme) as StoreTheme;
  const heroPayload = row.hero_payload as Partial<StorefrontTemplateSeedDefinition["hero"]> | null;

  return {
    ...fallback,
    id: resolveCompatibleTemplateSeedId(row.id, {
      productVisibility: typeof (row.default_site_settings as Record<string, unknown> | null | undefined)?.storefront_profile === "object"
        ? (((row.default_site_settings as Record<string, Json>).storefront_profile as Record<string, Json>)?.product_visibility as string | null | undefined) ?? null
        : null,
    }) ?? row.id,
    legacyTemplateId: typeof row.legacy_template_id === "string" ? (row.legacy_template_id as LaunchTemplateId) : fallback.legacyTemplateId,
    name: row.name,
    shortName: row.short_name ?? fallback.shortName,
    description: row.description ?? fallback.description,
    businessFamily: (row.business_family as StoreBusinessFamily | null) ?? fallback.businessFamily,
    catalogMode: (row.catalog_mode as StoreCatalogMode | null) ?? fallback.catalogMode,
    group: row.group_name ?? fallback.group,
    recommendedPageSet: isStringArray(row.recommended_page_set) ? row.recommended_page_set : fallback.recommendedPageSet,
    compatibleBlockSet: isStringArray(row.compatible_block_set) ? row.compatible_block_set : fallback.compatibleBlockSet,
    recommendedBlockSet: isStringArray(row.recommended_block_set) ? row.recommended_block_set : fallback.recommendedBlockSet,
    defaultBlockSet: isStringArray(row.default_block_set) ? row.default_block_set : fallback.defaultBlockSet,
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
    defaultSiteSettings: mergeTemplateSeedSiteSettings(fallback.defaultSiteSettings, row.default_site_settings),
    schemaVersion: row.schema_version ?? fallback.schemaVersion ?? 1,
  };
}
