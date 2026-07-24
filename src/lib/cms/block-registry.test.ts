import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fallbackBlockRegistry, filterBlockRegistryForBlueprint } from "@/lib/cms/block-registry";
import { resolveStoreBlueprint } from "@/lib/cms/store-blueprints";

describe("block registry blueprint filtering", () => {
  it("keeps landing-page stores on content-first sections and hides catalog blocks", () => {
    const landingBlueprint = resolveStoreBlueprint("landing-page");
    const filtered = filterBlockRegistryForBlueprint(fallbackBlockRegistry, landingBlueprint);
    const values = filtered.map((item) => item.value);

    assert.ok(values.includes("hero"));
    assert.ok(values.includes("rich-text"));
    assert.ok(values.includes("trust-badges"));
    assert.ok(values.includes("faq-accordion"));
    assert.equal(values.includes("featured-products"), false);
    assert.equal(values.includes("category-showcase"), false);
    assert.equal(values.includes("recently-viewed"), false);
  });

  it("keeps menu storefront catalog tools available when the blueprint supports them", () => {
    const menuBlueprint = resolveStoreBlueprint("food");
    const filtered = filterBlockRegistryForBlueprint(fallbackBlockRegistry, menuBlueprint);
    const values = filtered.map((item) => item.value);

    assert.ok(values.includes("featured-products"));
    assert.ok(values.includes("social-feed"));
    assert.ok(values.includes("faq-accordion"));
  });
});
