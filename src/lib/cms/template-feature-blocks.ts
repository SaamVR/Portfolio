import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";

export type TemplateFeatureBlockType = Extract<StorePageBlock["type"], "comparison">;

export type TemplateFeatureBlockDefinition = {
  type: TemplateFeatureBlockType;
  label: string;
  shortLabel: string;
  description: string;
  supportedTemplates: StorefrontTemplateId[];
};

export const templateFeatureBlockDefinitions: TemplateFeatureBlockDefinition[] = [
  {
    type: "comparison",
    label: "Product Comparison",
    shortLabel: "Comparison",
    description: "Compare a small set of products with spec-focused cards and a direct path into product details.",
    supportedTemplates: ["electronics", "general-catalog", "digital-downloads", "subscriptions", "inquiry-catalog"],
  },
];

export function getTemplateFeatureBlockDefinitions(templateId: StorefrontTemplateId) {
  return templateFeatureBlockDefinitions.filter((definition) => definition.supportedTemplates.includes(templateId));
}

export function isTemplateFeatureBlockType(type: StorePageBlock["type"]): type is TemplateFeatureBlockType {
  return templateFeatureBlockDefinitions.some((definition) => definition.type === type);
}
