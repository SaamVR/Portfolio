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


  it("keeps Threads carousel-first without exposing the product carousel to Fashion", () => {
    const threadsCategories = getBasicLayoutVariantOptions("threads", "category-showcase").map((option) => option.id);
    const threadsProducts = getBasicLayoutVariantOptions("threads", "featured-products").map((option) => option.id);
    const fashionProducts = getBasicLayoutVariantOptions("fashion", "featured-products").map((option) => option.id);

    expect(threadsCategories[0]).toBe("carousel");
    expect(threadsProducts[0]).toBe("carousel");
    expect(fashionProducts).not.toContain("carousel");
  });

  it("registers the specialized heroes in the shared block capability registry", () => {
    const hero = fallbackBlockRegistry.find((block) => block.value === "hero");

    expect(hero?.variantIds).toContain("poster");
    expect(hero?.variantIds).toContain("collection-spotlight");

    const featuredProducts = fallbackBlockRegistry.find((block) => block.value === "featured-products");
    expect(featuredProducts?.variantIds).toContain("carousel");
  });
});
