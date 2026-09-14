import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compositionRecipeRegistry } from "@/lib/cms/storefront-platform/composition/recipes";
import type { StorePageBlock } from "@/lib/cms/schema";
import { buildEditorCompatibilityContext } from "@/lib/cms/storefront-platform/editor/platform-contracts";
import {
  evaluateStorefrontVariantCompatibility,
  isStorefrontVariantAvailable,
  resolveCompatibleCompositionRecipe,
  resolveCompatibleStorefrontVariant,
  validateMobileFirstResponsiveContract,
} from "@/lib/cms/storefront-platform/variants/compatibility";
import { canonicalStorefrontVariantRegistry, getStorefrontVariantDefinition } from "@/lib/cms/storefront-platform/variants/registry";

describe("storefront compatibility contracts", () => {
  it("keeps every reusable variant and recipe mobile-first", () => {
    for (const variant of canonicalStorefrontVariantRegistry) {
      assert.deepEqual(validateMobileFirstResponsiveContract(variant.responsive), [], `${variant.blockType}:${variant.id}`);
      assert.ok(variant.safeFallback);
      assert.ok(variant.performanceClass);
      assert.ok(variant.interactionRequirement);
    }

    for (const recipe of compositionRecipeRegistry) {
      assert.deepEqual(validateMobileFirstResponsiveContract(recipe.responsive), [], recipe.id);
      assert.ok(recipe.safeFallbackRecipeId);
      assert.ok(recipe.performanceClass);
      assert.ok(recipe.interactionRequirement);
    }
  });

  it("uses variant fallback chains when media, capability, or item requirements are not met", () => {
    const context = {
      businessFamily: "commerce" as const,
      capabilities: ["catalog"],
      itemCount: 8,
      mediaCount: 0,
      hasPrimaryMedia: false,
    };

    assert.equal(resolveCompatibleStorefrontVariant("hero", "full-bleed", context)?.id, "centered");
    assert.equal(resolveCompatibleStorefrontVariant("category-showcase", "masonry", context)?.id, "cards");

    const serviceContext = {
      businessFamily: "service" as const,
      capabilities: [] as string[],
      hasPrimaryMedia: true,
      mediaCount: 1,
    };
    assert.equal(resolveCompatibleStorefrontVariant("hero", "collection-spotlight", serviceContext)?.id, "split");
  });


  it("uses section limits as an upper bound for DB-sourced compatibility", () => {
    const productBlock = {
      id: "featured-1", type: "featured-products", sortOrder: 0, isVisible: true, visible: true,
      props: { source: "all", limit: 2 },
    } as StorePageBlock;
    const productContext = buildEditorCompatibilityContext("general-catalog", productBlock);
    assert.equal(productContext.itemCount, undefined);
    assert.equal(productContext.itemCountUpperBound, 2);
    const fourCol = getStorefrontVariantDefinition("featured-products", "4-col");
    assert.ok(fourCol);
    assert.equal(evaluateStorefrontVariantCompatibility(fourCol, productContext).compatible, false);

    const categoryBlock = {
      id: "categories-1", type: "category-showcase", sortOrder: 1, isVisible: true, visible: true,
      props: { source: "categories", limit: 2 },
    } as StorePageBlock;
    const categoryContext = buildEditorCompatibilityContext("general-catalog", categoryBlock);
    const masonry = getStorefrontVariantDefinition("category-showcase", "masonry");
    assert.ok(masonry);
    assert.equal(evaluateStorefrontVariantCompatibility(masonry, categoryContext).compatible, false);
  });

  it("uses one merchant visibility policy for lifecycle and template-exclusive styles", () => {
    const base = getStorefrontVariantDefinition("hero", "centered");
    assert.ok(base);
    const context = { businessFamily: "commerce" as const, capabilities: ["catalog"], templateId: "threads" };

    assert.equal(isStorefrontVariantAvailable({ ...base, lifecycle: "draft" }, context), false);
    assert.equal(isStorefrontVariantAvailable({ ...base, visibility: "admin-only" }, context), false);
    assert.equal(isStorefrontVariantAvailable({ ...base, lifecycle: "deprecated" }, context, { currentVariantId: base.id }), true);
    assert.equal(isStorefrontVariantAvailable({ ...base, visibility: "template-exclusive", recommendedFor: { templateIds: ["threads"] } }, context), true);
    assert.equal(isStorefrontVariantAvailable({ ...base, visibility: "template-exclusive", recommendedFor: { templateIds: ["fashion"] } }, context), false);
  });

  it("falls media-dependent recipes back to a no-media composition", () => {
    const context = {
      businessFamily: "commerce" as const,
      capabilities: ["catalog"],
      mediaCount: 0,
      hasPrimaryMedia: false,
    };

    assert.equal(resolveCompatibleCompositionRecipe("editorial-story", context)?.id, "basic-content");
    assert.equal(resolveCompatibleCompositionRecipe("modern-promotion", context)?.id, "basic-content");
  });
});
