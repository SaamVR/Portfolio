import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compositionRecipeRegistry,
  createCompositionDocumentFromRecipe,
  getCompositionRecipe,
} from "@/lib/cms/storefront-platform/composition/recipes";
import { compositionDocumentSchema } from "@/lib/cms/storefront-platform/composition/schema";

describe("composition recipes", () => {
  it("proves materially different sections share one composition schema", () => {
    const editorial = createCompositionDocumentFromRecipe("editorial-story");
    const promotion = createCompositionDocumentFromRecipe("modern-promotion");

    assert.equal(compositionDocumentSchema.safeParse(editorial).success, true);
    assert.equal(compositionDocumentSchema.safeParse(promotion).success, true);
    assert.notDeepEqual(editorial.tree, promotion.tree);

    const editorialJson = JSON.stringify(editorial);
    const promotionJson = JSON.stringify(promotion);
    assert.match(editorialJson, /editorial-media/);
    assert.match(editorialJson, /editorial-story-panel/);
    assert.match(editorialJson, /editorial-badge/);
    assert.match(editorialJson, /editorial-actions/);
    assert.match(editorialJson, /editorial-decoration/);

    assert.match(promotionJson, /promotion-media/);
    assert.match(promotionJson, /promotion-offer-surface/);
    assert.match(promotionJson, /promotion-actions/);
    assert.match(promotionJson, /Shop offer/);
    assert.match(promotionJson, /Learn more/);
  });

  it("gives every recipe compatibility, responsive, fallback, interaction, and performance metadata", () => {
    for (const recipe of compositionRecipeRegistry) {
      assert.ok(recipe.compatibleBusinessFamilies.length > 0);
      assert.ok(recipe.safeFallbackRecipeId);
      assert.ok(getCompositionRecipe(recipe.safeFallbackRecipeId), `missing safe fallback for ${recipe.id}`);
      assert.ok(recipe.responsive.mobile);
      assert.ok(recipe.responsive.tablet);
      assert.ok(recipe.responsive.desktop);
      assert.ok(recipe.interactionRequirement);
      assert.ok(recipe.performanceClass);
      assert.equal(recipe.version, 1);
    }
  });
});
