import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalStorefrontVariantRegistry,
  getStorefrontVariantDefinition,
  getVariantIdsForBlock,
  resolveStorefrontVariant,
} from "@/lib/cms/storefront-platform/variants/registry";
import { validateStorefrontVariantManifest } from "@/lib/cms/storefront-platform/variants/validation";

describe("canonical storefront variant registry", () => {
  it("keeps block/id pairs unique and every fallback resolvable", () => {
    const seen = new Set<string>();

    for (const definition of canonicalStorefrontVariantRegistry) {
      const key = `${definition.blockType}:${definition.id}`;
      assert.equal(seen.has(key), false, `duplicate variant definition: ${key}`);
      seen.add(key);
      assert.ok(
        getStorefrontVariantDefinition(definition.blockType, definition.safeFallback),
        `missing safe fallback for ${key}`,
      );
      assert.equal(definition.version, 1);
      assert.ok(definition.responsive.mobile, `missing mobile contract for ${key}`);
      assert.deepEqual(validateStorefrontVariantManifest(definition), [], `invalid manifest: ${key}`);
    }
  });

  it("preserves the currently supported variant ids", () => {
    assert.deepEqual(getVariantIdsForBlock("hero"), ["full-bleed", "split", "centered", "editorial", "poster", "collection-spotlight"]);
    assert.deepEqual(getVariantIdsForBlock("featured-products"), ["carousel", "2-col", "3-col", "4-col", "3-col-sidebar-left", "3-col-sidebar-right"]);
    assert.deepEqual(getVariantIdsForBlock("category-showcase"), ["cards", "carousel", "masonry", "compact-list"]);
    assert.deepEqual(getVariantIdsForBlock("rich-text"), ["standard", "brand-story", "blog-posts"]);
  });

  it("falls back safely for unknown variant ids", () => {
    assert.equal(resolveStorefrontVariant("hero", "not-real")?.id, "centered");
    assert.equal(resolveStorefrontVariant("comparison", "not-real")?.id, "default");
  });
});
