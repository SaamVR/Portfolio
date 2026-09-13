import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { buildEditorCompatibilityContext } from "@/lib/cms/storefront-platform/editor/platform-contracts";
import { evaluateStorefrontVariantCompatibility } from "@/lib/cms/storefront-platform/variants/compatibility";
import type { StorefrontVariantDefinition } from "@/lib/cms/storefront-platform/variants/contracts";
import { getStorefrontVariantDefinitions } from "@/lib/cms/storefront-platform/variants/registry";

export type SectionStyleLibraryEntry = {
  definition: StorefrontVariantDefinition;
  compatible: boolean;
  reasons: string[];
  recommended: boolean;
  current: boolean;
  contentHints: string[];
};

function hasUsefulProp(block: StorePageBlock, key: string) {
  const value = (block.props as Record<string, unknown> | undefined)?.[key];
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null;
}

function contentHints(definition: StorefrontVariantDefinition, block: StorePageBlock): string[] {
  const hints: string[] = [];
  for (const key of definition.requirements.requiredContentKeys ?? []) {
    if (!hasUsefulProp(block, key)) hints.push(`Add ${key.replaceAll(/([A-Z])/g, " $1").toLowerCase()} before publishing this style.`);
  }
  for (const key of definition.requirements.recommendedContentKeys ?? []) {
    if (!hasUsefulProp(block, key)) hints.push(`Works best with ${key.replaceAll(/([A-Z])/g, " $1").toLowerCase()}.`);
  }
  return hints;
}

function isRecommended(definition: StorefrontVariantDefinition, templateId: StorefrontTemplateId, businessFamily: string) {
  return definition.recommendedFor?.templateIds?.includes(templateId)
    || definition.recommendedFor?.businessFamilies?.includes(businessFamily as never)
    || definition.editor.badge === "recommended"
    || definition.visibility === "recommended";
}

function isMerchantVisible(definition: StorefrontVariantDefinition, templateId: StorefrontTemplateId, current: boolean) {
  if (current) return true;
  if (definition.lifecycle !== "published") return false;
  if (definition.visibility === "admin-only") return false;
  if (definition.visibility === "template-exclusive") {
    return definition.recommendedFor?.templateIds?.includes(templateId) ?? false;
  }
  return true;
}

export function getSectionStyleLibraryEntries(
  templateId: StorefrontTemplateId,
  block: StorePageBlock,
): SectionStyleLibraryEntry[] {
  const context = buildEditorCompatibilityContext(templateId, block);
  return getStorefrontVariantDefinitions(block.type)
    .map((definition) => {
      const current = block.layoutVariant === definition.id;
      const compatibility = evaluateStorefrontVariantCompatibility(definition, context);
      return {
        definition,
        compatible: compatibility.compatible,
        reasons: compatibility.reasons,
        recommended: isRecommended(definition, templateId, context.businessFamily),
        current,
        contentHints: contentHints(definition, block),
      };
    })
    .filter((entry) => isMerchantVisible(entry.definition, templateId, entry.current))
    .sort((left, right) => Number(right.recommended) - Number(left.recommended) || left.definition.editor.order - right.definition.editor.order);
}

export function getSectionStyleSupportedBlockTypes() {
  return Array.from(new Set(getStorefrontVariantDefinitions("hero").length
    ? ["hero", "category-showcase", "featured-products", "promo-banner", "rich-text", "recommended-products", "trust-badges", "social-feed"]
    : [])) as StorePageBlock["type"][];
}
