import type { LaunchTemplateId } from "@/lib/cms/launch-templates";
import type { StoreTheme } from "@/lib/cms/schema";
import {
  buildStorefrontTemplateSiteSettingsEntries,
  resolveCompatibleTemplateSeedId,
  storefrontTemplateSeedDefinitions,
  type BlueprintOnboardingStep,
  type StoreBusinessFamily,
  type StoreCatalogMode,
  type StorefrontTemplateSeedDefinition,
} from "@/lib/cms/storefront-templates";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
export type { StoreBusinessFamily, StoreCatalogMode, BlueprintOnboardingStep } from "@/lib/cms/storefront-templates";

export interface StoreBlueprintDefinition extends Omit<StorefrontTemplateSeedDefinition, "legacyBlueprintIds"> {
  schemaVersion?: number;
}

function cloneBlueprintDefinition(definition: StorefrontTemplateSeedDefinition): StoreBlueprintDefinition {
  return {
    ...definition,
    recommendedPageSet: [...definition.recommendedPageSet],
    recommendedBlockSet: [...definition.recommendedBlockSet],
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

export const fallbackStoreBlueprints: StoreBlueprintDefinition[] = storefrontTemplateSeedDefinitions.map(cloneBlueprintDefinition);

export function findStoreBlueprintById(
  id: string | null | undefined,
  blueprints: StoreBlueprintDefinition[] = fallbackStoreBlueprints,
): StoreBlueprintDefinition | undefined {
  const normalizedTemplateId = resolveCompatibleTemplateSeedId(id ?? null);

  return blueprints.find((item) => item.id === normalizedTemplateId)
    ?? blueprints.find((item) => item.id === id)
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
  return buildStorefrontTemplateSiteSettingsEntries(blueprint, overrides);
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
  schema_version?: number | null;
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
    schemaVersion: row.schema_version ?? fallback.schemaVersion ?? 1,
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
      "schema_version",
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
      "schema_version",
      "is_active",
    ].join(","))
    .eq("id", blueprintId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return buildBlueprintDefinitionFromRow(data as StoreBlueprintRow);
}
