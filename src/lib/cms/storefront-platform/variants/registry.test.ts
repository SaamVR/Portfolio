import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { storefrontTemplateIds, getStorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
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
    assert.deepEqual(getVariantIdsForBlock("featured-products"), ["carousel", "2-col", "3-col", "grid", "4-col", "3-col-sidebar-left", "3-col-sidebar-right", "editorial-grid", "center-focus-rail", "compact-commerce-grid", "product-spotlight", "magazine-rail", "dense-catalog"]);
    assert.deepEqual(getVariantIdsForBlock("category-showcase"), ["cards", "carousel", "circular-categories", "collection-tiles", "masonry", "compact-list"]);
    assert.deepEqual(getVariantIdsForBlock("promo-banner"), ["standard", "contact-cta", "dual-editorial", "image-campaign-banner", "dual-promo", "campaign-cta"]);
    assert.deepEqual(getVariantIdsForBlock("rich-text"), ["standard", "centered", "brand-story", "blog-posts", "split-brand-story", "editorial-quote", "minimal-story"]);
  });

  it("registers every declared template default and keeps previews truthful", () => {
    for (const templateId of storefrontTemplateIds) {
      const template = getStorefrontTemplateDefinition(templateId);
      for (const [blockType, variantId] of Object.entries(template.presentation.blockLayoutVariants ?? {})) {
        assert.ok(
          getStorefrontVariantDefinition(blockType as any, variantId),
          `missing template default ${templateId}:${blockType}:${variantId}`,
        );
      }
    }

    for (const definition of canonicalStorefrontVariantRegistry) {
      assert.notEqual(definition.previewSpec.desktop.mode, "live", `${definition.blockType}:${definition.id} desktop preview must not claim live rendering`);
      assert.notEqual(definition.previewSpec.mobile.mode, "live", `${definition.blockType}:${definition.id} mobile preview must not claim live rendering`);
    }
  });

  it("matches responsive metadata to the public breakpoint behavior", () => {
    assert.equal(getStorefrontVariantDefinition("hero", "split")?.responsive.tablet.columns, 1);
    assert.equal(getStorefrontVariantDefinition("category-showcase", "masonry")?.responsive.mobile.columns, 2);
    assert.equal(getStorefrontVariantDefinition("category-showcase", "masonry")?.responsive.tablet.columns, 3);
    assert.equal(getStorefrontVariantDefinition("featured-products", "3-col")?.responsive.tablet.columns, 2);
    assert.equal(getStorefrontVariantDefinition("featured-products", "4-col")?.responsive.tablet.columns, 2);
    assert.equal(getStorefrontVariantDefinition("featured-products", "editorial-grid")?.responsive.tablet.columns, 2);
    assert.equal(getStorefrontVariantDefinition("featured-products", "product-spotlight")?.responsive.tablet.columns, 2);
  });

  it("falls back safely for unknown variant ids", () => {
    assert.equal(resolveStorefrontVariant("hero", "not-real")?.id, "centered");
    assert.equal(resolveStorefrontVariant("comparison", "not-real")?.id, "default");
  });
});
