import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StorePageBlock } from "@/lib/cms/schema";
import { storePageBlockSchema } from "@/lib/cms/schema";
import { getStorefrontVariantDefinition, getStorefrontVariantDefinitions } from "./registry";
import { applySectionStyleToBlock } from "./section-style-library";
import {
  getEffectiveVariantOptions,
  getExplicitVariantOptions,
  normalizeVariantOptionsForDefinition,
  resetAllVariantOptions,
  resetVariantOption,
} from "./variant-options";

function hero(overrides: Partial<StorePageBlock> = {}): StorePageBlock {
  return {
    id: "hero-1",
    type: "hero",
    sortOrder: 0,
    isVisible: true,
    visible: true,
    layoutVariant: "split",
    props: {},
    ...overrides,
  } as StorePageBlock;
}

describe("R4 Section Studio variant option contract", () => {
  it("keeps only canonical valid values at the schema boundary", () => {
    const parsed = storePageBlockSchema.parse({
      ...hero(),
      variantOptions: { alignment: "left", spacing: "not-real", rogue: "value" },
    });
    assert.deepEqual(parsed.variantOptions, { alignment: "left" });
  });

  it("normalizes explicit options against the effective style capabilities", () => {
    const centered = getStorefrontVariantDefinition("hero", "centered");
    assert.deepEqual(
      normalizeVariantOptionsForDefinition(centered, { contentWidth: "standard", mediaFit: "contain" }),
      { contentWidth: "standard" },
    );
  });

  it("strips unsupported options when changing styles", () => {
    const changed = applySectionStyleToBlock(
      hero({ variantOptions: { mediaFit: "contain", contentWidth: "standard" } }),
      "centered",
      "threads",
    );
    assert.equal(changed.layoutVariant, "centered");
    assert.deepEqual(changed.variantOptions, { contentWidth: "standard" });
  });

  it("resets one or all explicit options without changing layoutVariant", () => {
    const block = hero({ variantOptions: { mediaFit: "contain", spacing: "compact" } });
    const one = resetVariantOption(block, "mediaFit");
    assert.equal(one.layoutVariant, "split");
    assert.deepEqual(one.variantOptions, { spacing: "compact" });
    const all = resetAllVariantOptions(one);
    assert.equal(all.layoutVariant, "split");
    assert.equal(all.variantOptions, undefined);
  });

  it("prefers modern explicit values over supported legacy props", () => {
    const legacy = hero({ props: { mediaFit: "contain" } as StorePageBlock["props"] });
    assert.equal(getEffectiveVariantOptions("threads", legacy)?.mediaFit, "contain");
    const modern = { ...legacy, variantOptions: { mediaFit: "cover" } } as StorePageBlock;
    assert.equal(getExplicitVariantOptions("threads", modern)?.mediaFit, "cover");
    assert.equal(getEffectiveVariantOptions("threads", modern)?.mediaFit, "cover");
  });

  it("declares useful capabilities for the five R4 core section types", () => {
    for (const type of ["hero", "category-showcase", "featured-products", "promo-banner", "rich-text"] as const) {
      assert.ok(
        getStorefrontVariantDefinitions(type).some((definition) => Object.keys(definition.optionCapabilities ?? {}).length > 0),
        `${type} needs at least one option-capable style`,
      );
    }
  });
});
