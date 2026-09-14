import type { StorePageBlock } from "@/lib/cms/schema";
import type { StoreBusinessFamily } from "@/lib/cms/storefront-template-seeds";
import { getStorefrontTemplateDefinition, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { buildEditorCompatibilityContext } from "@/lib/cms/storefront-platform/editor/platform-contracts";
import { evaluateStorefrontVariantCompatibility, getAvailableStorefrontVariantDefinitions } from "@/lib/cms/storefront-platform/variants/compatibility";
import type { StorefrontVariantDefinition } from "@/lib/cms/storefront-platform/variants/contracts";
import { getStorefrontVariantDefinitions } from "@/lib/cms/storefront-platform/variants/registry";

export type SectionStyleLibraryEntry = {
  definition: StorefrontVariantDefinition;
  compatible: boolean;
  reasons: string[];
  recommended: boolean;
  templateDefault: boolean;
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

function isRecommended(definition: StorefrontVariantDefinition, templateId: StorefrontTemplateId, businessFamily: StoreBusinessFamily, templateDefaultId?: string) {
  return Boolean(
    definition.id === templateDefaultId
      || definition.recommendedFor?.templateIds?.includes(templateId)
      || definition.recommendedFor?.businessFamilies?.includes(businessFamily)
      || definition.editor.badge === "recommended"
      || definition.visibility === "recommended"
  );
}


export function getEffectiveSectionStyleVariantId(
  templateId: StorefrontTemplateId,
  block: StorePageBlock,
): string | undefined {
  return block.layoutVariant
    ?? getStorefrontTemplateDefinition(templateId).presentation.blockLayoutVariants?.[block.type];
}

export function getSectionStyleLibraryEntries(
  templateId: StorefrontTemplateId,
  block: StorePageBlock,
): SectionStyleLibraryEntry[] {
  const context = buildEditorCompatibilityContext(templateId, block);
  const templateDefaultId = getStorefrontTemplateDefinition(templateId).presentation.blockLayoutVariants?.[block.type];
  const effectiveVariantId = getEffectiveSectionStyleVariantId(templateId, block);
  return getAvailableStorefrontVariantDefinitions(block.type, context, { currentVariantId: effectiveVariantId })
    .map((definition) => {
      const current = effectiveVariantId === definition.id;
      const compatibility = evaluateStorefrontVariantCompatibility(definition, context);
      return {
        definition,
        compatible: compatibility.compatible,
        reasons: compatibility.reasons,
        recommended: isRecommended(definition, templateId, context.businessFamily, templateDefaultId),
        templateDefault: definition.id === templateDefaultId,
        current,
        contentHints: contentHints(definition, block),
      };
    })
    .sort((left, right) => Number(right.recommended) - Number(left.recommended) || left.definition.editor.order - right.definition.editor.order);
}



export function getSectionStyleResetTarget(
  templateId: StorefrontTemplateId,
  block: StorePageBlock,
): SectionStyleLibraryEntry | undefined {
  const entries = getSectionStyleLibraryEntries(templateId, { ...block, layoutVariant: undefined });
  return entries.find((entry) => entry.templateDefault && entry.compatible)
    ?? entries.find((entry) => entry.recommended && entry.compatible)
    ?? entries.find((entry) => entry.compatible);
}

export function applySectionStyleToBlock(
  block: StorePageBlock,
  variantId: string | null | undefined,
): StorePageBlock {
  return {
    ...block,
    layoutVariant: variantId ?? undefined,
  };
}

export function buildSectionStylePersistencePatch(variantId: string | null | undefined) {
  return { layout_variant: variantId ?? null };
}

export function getSectionStyleSupportedBlockTypes() {
  return Array.from(new Set(getStorefrontVariantDefinitions("hero").length
    ? ["hero", "category-showcase", "featured-products", "promo-banner", "rich-text", "recommended-products", "trust-badges", "social-feed"]
    : [])) as StorePageBlock["type"][];
}
