import type { StorePageBlock } from "@/lib/cms/schema";
import type { StorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
import { getStorefrontVariantDefinition } from "@/lib/cms/storefront-platform/variants/registry";

/**
 * Specialized template renderers own the template default and any private
 * template variant. Published shared variants are rendered by the shared
 * block renderer so a merchant style switch has an observable result.
 */
export function shouldUseSpecializedBlockRenderer(
  block: StorePageBlock,
  template: StorefrontTemplateDefinition,
): boolean {
  const requested = block.layoutVariant;
  if (!requested) return true;

  const templateDefault = template.presentation.blockLayoutVariants?.[block.type];
  if (templateDefault === requested) return true;

  const definition = getStorefrontVariantDefinition(block.type, requested);
  if (!definition) return true;
  if (
    definition.rendererKey?.startsWith(`${template.id}/`) ||
    (template.rendererKind === "fashion" && definition.rendererKey?.startsWith("threads/"))
  ) {
    return true;
  }

  return false;
}

