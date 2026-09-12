import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compositionRecipeRegistry } from "@/lib/cms/storefront-platform/composition/recipes";
import {
  resolveCompatibleCompositionRecipe,
  resolveCompatibleStorefrontVariant,
  validateMobileFirstResponsiveContract,
} from "@/lib/cms/storefront-platform/variants/compatibility";
import { canonicalStorefrontVariantRegistry } from "@/lib/cms/storefront-platform/variants/registry";

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
