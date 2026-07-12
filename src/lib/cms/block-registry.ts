import type { SupabaseClient } from "@supabase/supabase-js";
import { createDefaultBlock, cmsBlockTypeOptions } from "@/lib/cms/block-library";
import type { StorePageBlock } from "@/lib/cms/schema";
import type { Database, Json } from "@/integrations/supabase/types";
import type { StoreBusinessFamily } from "@/lib/cms/store-blueprints";

export interface CmsBlockRegistryItem {
  value: StorePageBlock["type"];
  label: string;
  description: string;
  layer: "core" | "commerce" | "extension";
  compatibleBusinessFamilies: StoreBusinessFamily[];
  requiredCapabilities: string[];
}

const allBusinessFamilies: StoreBusinessFamily[] = ["commerce", "booking", "listing", "service"];

export const fallbackBlockRegistry: CmsBlockRegistryItem[] = cmsBlockTypeOptions.map((option) => ({
  ...option,
  layer: option.value === "hero" || option.value === "rich-text" || option.value === "social-feed" || option.value === "faq-accordion" || option.value === "testimonials" || option.value === "trust-badges"
    ? "core"
    : "commerce",
  compatibleBusinessFamilies:
    option.value === "hero" || option.value === "rich-text" || option.value === "social-feed" || option.value === "faq-accordion" || option.value === "testimonials" || option.value === "trust-badges"
      ? allBusinessFamilies
      : ["commerce"],
  requiredCapabilities:
    option.value === "featured-products" || option.value === "recently-viewed" || option.value === "category-showcase"
      ? ["catalog"]
      : [],
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

export function createRegistryDefaultBlock(type: StorePageBlock["type"], sortOrder: number) {
  return createDefaultBlock(type, sortOrder);
}
