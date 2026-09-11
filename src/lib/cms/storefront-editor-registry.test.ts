import { describe, expect, it } from "@/test/test-utils";
import { fallbackBlockRegistry } from "@/lib/cms/block-registry";
import { getBasicLayoutVariantOptions } from "@/lib/cms/storefront-editor-registry";

describe("storefront editor layout variants", () => {
  it("offers Fashion-specific campaign heroes only to Fashion", () => {
    const fashion = getBasicLayoutVariantOptions("fashion", "hero").map((option) => option.id);
    const beauty = getBasicLayoutVariantOptions("beauty", "hero").map((option) => option.id);
    const electronics = getBasicLayoutVariantOptions("electronics", "hero").map((option) => option.id);

    expect(fashion).toEqual([
      "editorial",
      "poster",
      "collection-spotlight",
      "full-bleed",
      "split",
      "centered",
    ]);
    expect(beauty).not.toContain("poster");
    expect(beauty).not.toContain("collection-spotlight");
    expect(electronics).not.toContain("poster");
    expect(electronics).not.toContain("collection-spotlight");
  });

  it("registers the specialized heroes in the shared block capability registry", () => {
    const hero = fallbackBlockRegistry.find((block) => block.value === "hero");

    expect(hero?.variantIds).toContain("poster");
    expect(hero?.variantIds).toContain("collection-spotlight");
  });
});
