import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createRegistryDefaultBlock,
  fallbackBlockRegistry,
  filterBlockRegistryForTemplateSeed,
  prioritizeRecommendedBlocks,
} from "@/lib/cms/block-registry";
import { storePageBlockSchema } from "@/lib/cms/schema";
import { resolveStorefrontTemplateSeed } from "@/lib/cms/storefront-template-seeds";
import { getVariantIdsForBlock } from "@/lib/cms/storefront-platform/variants/registry";

describe("block registry template-seed filtering", () => {
  it("returns all compatible blocks for advanced and blank flows, even beyond the recommended set", () => {
    const landingBlueprint = resolveStorefrontTemplateSeed("landing-page");
    const filtered = filterBlockRegistryForTemplateSeed(fallbackBlockRegistry, landingBlueprint);
    const values = filtered.map((item) => item.value);

    assert.ok(values.includes("hero"));
    assert.ok(values.includes("rich-text"));
    assert.ok(values.includes("trust-badges"));
    assert.ok(values.includes("faq-accordion"));
    assert.ok(values.includes("composition"));
    assert.equal(values.includes("featured-products"), true);
    assert.equal(values.includes("category-showcase"), false);
    assert.equal(values.includes("recently-viewed"), false);
  });

  it("keeps menu storefront catalog tools available when the template seed supports them", () => {
    const menuBlueprint = resolveStorefrontTemplateSeed("food");
    const filtered = filterBlockRegistryForTemplateSeed(fallbackBlockRegistry, menuBlueprint);
    const values = filtered.map((item) => item.value);

    assert.ok(values.includes("featured-products"));
    assert.ok(values.includes("social-feed"));
    assert.ok(values.includes("faq-accordion"));
    assert.ok(values.includes("composition"));
  });

  it("keeps recommended blocks at the top for guided flows", () => {
    const landingBlueprint = resolveStorefrontTemplateSeed("landing-page");
    const compatible = filterBlockRegistryForTemplateSeed(fallbackBlockRegistry, landingBlueprint);
    const prioritized = prioritizeRecommendedBlocks(compatible, landingBlueprint);
    const values = prioritized.map((item) => item.value);

    assert.deepEqual(values.slice(0, 4), ["faq-accordion", "hero", "rich-text", "trust-badges"]);
    assert.ok(values.indexOf("featured-products") > values.indexOf("trust-badges"));
  });

  it("consumes variant ids from the canonical variant registry", () => {
    const hero = fallbackBlockRegistry.find((item) => item.value === "hero");
    const categories = fallbackBlockRegistry.find((item) => item.value === "category-showcase");

    assert.deepEqual(hero?.variantIds, getVariantIdsForBlock("hero"));
    assert.deepEqual(categories?.variantIds, getVariantIdsForBlock("category-showcase"));
  });

  it("creates a schema-valid default universal composition block", () => {
    const composition = createRegistryDefaultBlock("composition", 4);
    const parsed = storePageBlockSchema.safeParse(composition);

    assert.equal(parsed.success, true);
    assert.equal(composition.type, "composition");
    assert.equal(composition.sortOrder, 4);
  });
});
