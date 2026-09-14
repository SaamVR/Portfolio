import type { StorePageBlock } from "@/lib/cms/schema";
import { getStorefrontTemplateDefinition, type StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import type { StorefrontVariantDefinition } from "./contracts";
import { getStorefrontVariantDefinition } from "./registry";
import {
  normalizeCanonicalVariantOptions,
  type StorefrontVariantOptionKey,
  type StorefrontVariantOptions,
} from "./variant-option-contract";

function isAllowed(definition: StorefrontVariantDefinition | undefined, key: StorefrontVariantOptionKey, value: unknown) {
  const capability = definition?.optionCapabilities?.[key];
  return Boolean(capability && (capability.allowedValues as readonly unknown[]).includes(value));
}

export function normalizeVariantOptionsForDefinition(
  definition: StorefrontVariantDefinition | undefined,
  value: unknown,
): StorefrontVariantOptions | undefined {
  if (!definition?.optionCapabilities) return undefined;
  const canonical = normalizeCanonicalVariantOptions(value);
  if (!canonical) return undefined;
  const normalized: StorefrontVariantOptions = {};
  for (const [key, candidate] of Object.entries(canonical) as Array<[StorefrontVariantOptionKey, unknown]>) {
    if (isAllowed(definition, key, candidate)) {
      (normalized as Record<string, unknown>)[key] = candidate;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function getVariantOptionDefaults(definition: StorefrontVariantDefinition | undefined): StorefrontVariantOptions | undefined {
  if (!definition?.optionCapabilities) return undefined;
  const defaults: StorefrontVariantOptions = {};
  for (const [key, capability] of Object.entries(definition.optionCapabilities) as Array<[StorefrontVariantOptionKey, NonNullable<StorefrontVariantDefinition["optionCapabilities"]>[StorefrontVariantOptionKey]]>) {
    if (capability?.defaultValue !== undefined && isAllowed(definition, key, capability.defaultValue)) {
      (defaults as Record<string, unknown>)[key] = capability.defaultValue;
    }
  }
  return Object.keys(defaults).length > 0 ? defaults : undefined;
}

export function getEffectiveVariantDefinition(templateId: StorefrontTemplateId, block: StorePageBlock) {
  const variantId = block.layoutVariant
    ?? getStorefrontTemplateDefinition(templateId).presentation.blockLayoutVariants?.[block.type];
  return getStorefrontVariantDefinition(block.type, variantId);
}

export function readLegacyVariantOptions(block: StorePageBlock): StorefrontVariantOptions | undefined {
  const props = block.props as Record<string, unknown>;
  const legacy: StorefrontVariantOptions = {};
  if (props.mediaFit === "cover" || props.mediaFit === "contain") legacy.mediaFit = props.mediaFit;
  const alignment = props.textAlignment ?? props.align;
  if (alignment === "left" || alignment === "center" || alignment === "right") legacy.alignment = alignment;
  if (props.paddingSize === "compact") legacy.spacing = "compact";
  if (props.paddingSize === "cozy") legacy.spacing = "comfortable";
  if (props.paddingSize === "large") legacy.spacing = "airy";
  return Object.keys(legacy).length > 0 ? legacy : undefined;
}

export function getExplicitVariantOptions(templateId: StorefrontTemplateId, block: StorePageBlock) {
  return normalizeVariantOptionsForDefinition(getEffectiveVariantDefinition(templateId, block), block.variantOptions);
}

export function getEffectiveVariantOptions(templateId: StorefrontTemplateId, block: StorePageBlock): StorefrontVariantOptions | undefined {
  const definition = getEffectiveVariantDefinition(templateId, block);
  if (!definition) return undefined;
  const defaults = getVariantOptionDefaults(definition) ?? {};
  const legacy = normalizeVariantOptionsForDefinition(definition, readLegacyVariantOptions(block)) ?? {};
  const explicit = normalizeVariantOptionsForDefinition(definition, block.variantOptions) ?? {};
  const effective = { ...defaults, ...legacy, ...explicit };
  return Object.keys(effective).length > 0 ? effective : undefined;
}

export function normalizeBlockVariantOptionsForStyle(
  block: StorePageBlock,
  definition: StorefrontVariantDefinition | undefined,
): StorePageBlock {
  return { ...block, variantOptions: normalizeVariantOptionsForDefinition(definition, block.variantOptions) };
}

export function resetVariantOption(block: StorePageBlock, key: StorefrontVariantOptionKey): StorePageBlock {
  const next = { ...(block.variantOptions ?? {}) };
  delete next[key];
  return { ...block, variantOptions: Object.keys(next).length > 0 ? next : undefined };
}

export function resetAllVariantOptions(block: StorePageBlock): StorePageBlock {
  return { ...block, variantOptions: undefined };
}

export function buildVariantOptionsPersistencePatch(value: unknown) {
  return { variant_options: normalizeCanonicalVariantOptions(value) ?? null };
}
