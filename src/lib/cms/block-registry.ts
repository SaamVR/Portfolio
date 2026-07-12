import { createDefaultBlock, cmsBlockTypeOptions } from "@/lib/cms/block-library";
import type { StorePageBlock } from "@/lib/cms/schema";
import type { StoreBusinessFamily } from "@/lib/cms/store-blueprints";

export interface CmsBlockRegistryItem {
  value: StorePageBlock["type"];
  label: string;
  description: string;
  layer: "core" | "commerce" | "extension";
  compatibleBusinessFamilies: StoreBusinessFamily[];
  requiredCapabilities: string[];
}

export const cmsBlockRegistry: CmsBlockRegistryItem[] = cmsBlockTypeOptions.map((option) => ({
  ...option,
  layer: option.value === "hero" || option.value === "rich-text" || option.value === "social-feed" || option.value === "faq-accordion" || option.value === "testimonials" || option.value === "trust-badges"
    ? "core"
    : "commerce",
  compatibleBusinessFamilies: ["commerce"],
  requiredCapabilities:
    option.value === "featured-products" || option.value === "recently-viewed" || option.value === "category-showcase"
      ? ["catalog"]
      : [],
}));

export function getCmsBlockRegistryItem(type: StorePageBlock["type"]) {
  return cmsBlockRegistry.find((item) => item.value === type) ?? cmsBlockRegistry[0];
}

export function createRegistryDefaultBlock(type: StorePageBlock["type"], sortOrder: number) {
  return createDefaultBlock(type, sortOrder);
}
