import type { SupabaseClient } from "@supabase/supabase-js";
import { createDefaultBlock, cmsBlockTypeOptions } from "@/lib/cms/block-library";
import type { StorePageBlock } from "@/lib/cms/schema";
import type { Database, Json } from "@/integrations/supabase/types";
import type { StorefrontTemplateSeedDefinition, StoreBusinessFamily } from "@/lib/cms/storefront-template-seeds";
import { getVariantIdsForBlock } from "@/lib/cms/storefront-platform/variants/registry";

export interface CmsBlockRegistryItem {
  value: StorePageBlock["type"];
  label: string;
  description: string;
  layer: "core" | "commerce" | "extension";
  compatibleBusinessFamilies: StoreBusinessFamily[];
  requiredCapabilities: string[];
  variantIds: string[];
  presetIds: string[];
}

const allBusinessFamilies: StoreBusinessFamily[] = ["commerce", "booking", "listing", "service", "donation"];
const coreBlockTypes = new Set<StorePageBlock["type"]>([
  "hero",
  "rich-text",
  "social-feed",
  "faq-accordion",
  "testimonials",
  "trust-badges",
  "promo-banner",
  "video-reel",
]);
const catalogBlockTypes = new Set<StorePageBlock["type"]>([
  "category-showcase",
  "comparison",
  "recommended-products",
  "recently-viewed",
]);

function resolveFallbackBusinessFamilies(type: StorePageBlock["type"]): StoreBusinessFamily[] {
  if (coreBlockTypes.has(type)) {
    return allBusinessFamilies;
  }

  if (type === "featured-products") {
    return ["commerce", "listing"];
  }

  return ["commerce"];
}

function resolveFallbackRequiredCapabilities(type: StorePageBlock["type"]): string[] {
  if (catalogBlockTypes.has(type)) {
    return ["catalog"];
  }

  return [];
}

export const fallbackBlockRegistry: CmsBlockRegistryItem[] = cmsBlockTypeOptions.map((option) => ({
  ...option,
  layer: coreBlockTypes.has(option.value) ? "core" : "commerce",
  compatibleBusinessFamilies: resolveFallbackBusinessFamilies(option.value),
  requiredCapabilities: resolveFallbackRequiredCapabilities(option.value),
  variantIds: getVariantIdsForBlock(option.value),
  presetIds: [],
}));

type BlockRegistryRow = {
  block_type: string;
  label: string;
  description: string | null;
  layer: string | null;
  compatible_business_families: Json | null;
  required_capabilities: Json | null;
  is_active: boolean | null;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function mergeBlockRegistryRow(row: BlockRegistryRow): CmsBlockRegistryItem {
  const fallback = fallbackBlockRegistry.find((item) => item.value === row.block_type) ?? fallbackBlockRegistry[0];

  return {
    ...fallback,
    value: row.block_type as StorePageBlock["type"],
    label: row.label,
    description: row.description ?? fallback.description,
    layer: row.layer === "core" || row.layer === "commerce" || row.layer === "extension" ? row.layer : fallback.layer,
    compatibleBusinessFamilies: isStringArray(row.compatible_business_families)
      ? row.compatible_business_families as StoreBusinessFamily[]
      : fallback.compatibleBusinessFamilies,
    requiredCapabilities: isStringArray(row.required_capabilities) ? row.required_capabilities : fallback.requiredCapabilities,
    variantIds: getVariantIdsForBlock(row.block_type as StorePageBlock["type"]),
    presetIds: fallback.presetIds,
  };
}

export async function loadBlockRegistry(
  client: SupabaseClient<Database>,
): Promise<CmsBlockRegistryItem[]> {
  const { data, error } = await client
    .from("block_registry_entries")
    .select("block_type, label, description, layer, compatible_business_families, required_capabilities, is_active")
    .order("label");

  if (error || !Array.isArray(data) || data.length === 0) {
    return fallbackBlockRegistry;
  }

  const inactiveTypes = new Set(
    data
      .filter((row) => row.is_active === false)
      .map((row) => row.block_type),
  );
  const mergedRows = data
    .filter((row) => row.is_active !== false)
    .map((row) => mergeBlockRegistryRow(row));
  const byType = new Map<string, CmsBlockRegistryItem>();

  for (const entry of mergedRows) {
    byType.set(entry.value, entry);
  }

  for (const fallback of fallbackBlockRegistry) {
    if (inactiveTypes.has(fallback.value) || byType.has(fallback.value)) continue;
    byType.set(fallback.value, fallback);
  }

  return Array.from(byType.values());
}

export function getCmsBlockRegistryItem(
  type: StorePageBlock["type"],
  registry: CmsBlockRegistryItem[] = fallbackBlockRegistry,
) {
  return registry.find((item) => item.value === type) ?? fallbackBlockRegistry.find((item) => item.value === type) ?? fallbackBlockRegistry[0];
}

export function filterBlockRegistryForTemplateSeed(
  registry: CmsBlockRegistryItem[],
  templateSeed: Pick<StorefrontTemplateSeedDefinition, "businessFamily" | "capabilities">,
) {
  return registry.filter(
    (block) =>
      block.compatibleBusinessFamilies.includes(templateSeed.businessFamily)
      && block.requiredCapabilities.every((capability) => templateSeed.capabilities.includes(capability)),
  );
}

export function prioritizeRecommendedBlocks(
  registry: CmsBlockRegistryItem[],
  templateSeed: Pick<StorefrontTemplateSeedDefinition, "recommendedBlockSet">,
) {
  const recommendedBlockSet = new Set(templateSeed.recommendedBlockSet);

  return [...registry].sort((left, right) => {
    const leftRecommended = recommendedBlockSet.has(left.value);
    const rightRecommended = recommendedBlockSet.has(right.value);

    if (leftRecommended === rightRecommended) {
      return left.label.localeCompare(right.label);
    }

    return leftRecommended ? -1 : 1;
  });
}

export function createRegistryDefaultBlock(type: StorePageBlock["type"], sortOrder: number) {
  return createDefaultBlock(type, sortOrder);
}
