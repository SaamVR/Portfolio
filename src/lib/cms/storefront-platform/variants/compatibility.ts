import type { StoreBusinessFamily } from "@/lib/cms/storefront-template-seeds";
import {
  compositionRecipeRegistry,
  getCompositionRecipe,
  type CompositionRecipeDefinition,
} from "@/lib/cms/storefront-platform/composition/recipes";
import type {
  StorefrontResponsiveContract,
  StorefrontVariantDefinition,
  StorefrontVariantRequirements,
} from "@/lib/cms/storefront-platform/variants/contracts";
import {
  getStorefrontVariantDefinition,
  getStorefrontVariantDefinitions,
} from "@/lib/cms/storefront-platform/variants/registry";
import type { StorePageBlock } from "@/lib/cms/schema";

export interface StorefrontCompatibilityContext {
  businessFamily: StoreBusinessFamily;
  capabilities: readonly string[];
  templateId?: string;
  itemCount?: number;
  mediaCount?: number;
  hasPrimaryMedia?: boolean;
}

export interface StorefrontCompatibilityResult {
  compatible: boolean;
  reasons: string[];
}

type CommonReusableDefinition = {
  compatibleBusinessFamilies: readonly StoreBusinessFamily[];
  requiredCapabilities: readonly string[];
  requirements: StorefrontVariantRequirements;
};

function evaluateRequirements(
  definition: CommonReusableDefinition,
  context: StorefrontCompatibilityContext,
): StorefrontCompatibilityResult {
  const reasons: string[] = [];

  if (!definition.compatibleBusinessFamilies.includes(context.businessFamily)) {
    reasons.push(`business family ${context.businessFamily} is not compatible`);
  }

  for (const capability of definition.requiredCapabilities) {
    if (!context.capabilities.includes(capability)) {
      reasons.push(`required capability ${capability} is missing`);
    }
  }

  if (
    definition.requirements.minItems !== undefined
    && context.itemCount !== undefined
    && context.itemCount < definition.requirements.minItems
  ) {
    reasons.push(`requires at least ${definition.requirements.minItems} items`);
  }

  if (
    definition.requirements.minMediaItems !== undefined
    && context.mediaCount !== undefined
    && context.mediaCount < definition.requirements.minMediaItems
  ) {
    reasons.push(`requires at least ${definition.requirements.minMediaItems} media items`);
  }

  if (definition.requirements.requiresPrimaryMedia && context.hasPrimaryMedia === false) {
    reasons.push("requires primary media");
  }

  return { compatible: reasons.length === 0, reasons };
}

export function evaluateStorefrontVariantCompatibility(
  definition: StorefrontVariantDefinition,
  context: StorefrontCompatibilityContext,
): StorefrontCompatibilityResult {
  return evaluateRequirements(definition, context);
}

export function evaluateCompositionRecipeCompatibility(
  definition: CompositionRecipeDefinition,
  context: StorefrontCompatibilityContext,
): StorefrontCompatibilityResult {
  return evaluateRequirements(definition, context);
}

export function resolveCompatibleStorefrontVariant(
  blockType: StorePageBlock["type"],
  requestedVariantId: string | null | undefined,
  context: StorefrontCompatibilityContext,
): StorefrontVariantDefinition | undefined {
  const definitions = getStorefrontVariantDefinitions(blockType);
  if (definitions.length === 0) return undefined;

  let candidate = getStorefrontVariantDefinition(blockType, requestedVariantId)
    ?? getStorefrontVariantDefinition(blockType, definitions[0]?.safeFallback)
    ?? definitions[0];
  const visited = new Set<string>();

  while (candidate && !visited.has(candidate.id)) {
    visited.add(candidate.id);
    if (evaluateStorefrontVariantCompatibility(candidate, context).compatible) {
      return candidate;
    }

    candidate = getStorefrontVariantDefinition(blockType, candidate.safeFallback);
  }

  return definitions.find((definition) => evaluateStorefrontVariantCompatibility(definition, context).compatible);
}

export function resolveCompatibleCompositionRecipe(
  requestedRecipeId: string | null | undefined,
  context: StorefrontCompatibilityContext,
): CompositionRecipeDefinition | undefined {
  let candidate = getCompositionRecipe(requestedRecipeId) ?? getCompositionRecipe("basic-content") ?? compositionRecipeRegistry[0];
  const visited = new Set<string>();

  while (candidate && !visited.has(candidate.id)) {
    visited.add(candidate.id);
    if (evaluateCompositionRecipeCompatibility(candidate, context).compatible) {
      return candidate;
    }

    candidate = getCompositionRecipe(candidate.safeFallbackRecipeId);
  }

  return compositionRecipeRegistry.find((recipe) => evaluateCompositionRecipeCompatibility(recipe, context).compatible);
}

export function validateMobileFirstResponsiveContract(contract: StorefrontResponsiveContract): string[] {
  const issues: string[] = [];

  if (contract.mobile.layout === "preserve") {
    issues.push("mobile layout must be explicit; preserve is reserved for enhancement breakpoints");
  }
  if (contract.mobile.columns !== undefined && contract.mobile.columns > 2) {
    issues.push("mobile layout may not declare more than two columns");
  }
  if (contract.tablet.columns !== undefined && contract.tablet.columns > 4) {
    issues.push("tablet layout may not declare more than four columns");
  }

  return issues;
}
