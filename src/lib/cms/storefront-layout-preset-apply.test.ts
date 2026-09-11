import { describe, expect, it } from "@/test/test-utils";
import { storePageBlockSchema, type StorePageBlock } from "@/lib/cms/schema";
import { applyStorefrontLayoutPreset } from "@/lib/cms/storefront-layout-preset-apply";
import { getStorefrontLayoutPreset } from "@/lib/cms/storefront-layout-presets";

function block(overrides: Partial<StorePageBlock> & Pick<StorePageBlock, "id" | "type" | "sortOrder">): StorePageBlock {
  return {
    isVisible: true,
    visible: true,
    props: {},
    ...overrides,
  } as StorePageBlock;
}

describe("storefront layout preset application", () => {
  it("reorders existing blocks and changes layout without replacing merchant content", () => {
    const preset = getStorefrontLayoutPreset("fashion-culture-graphic")!;
    const current = [
      block({ id: "products", type: "featured-products", sortOrder: 0, props: { title: "My Drop", source: "featured", limit: 6 } }),
      block({ id: "hero", type: "hero", sortOrder: 1, props: { title: "My Headline", mediaUrl: "/merchant.jpg" } }),
      block({ id: "categories", type: "category-showcase", sortOrder: 2, props: { title: "My Collections" } }),
    ];

    const result = applyStorefrontLayoutPreset(current, preset);
    const hero = result.blocks.find((item) => item.id === "hero")!;
    const products = result.blocks.find((item) => item.id === "products")!;

    expect(result.blocks.slice(0, 3).map((item) => item.id)).toEqual(["hero", "categories", "products"]);
    expect(hero.layoutVariant).toBe("poster");
    expect(hero.props).toEqual({ title: "My Headline", mediaUrl: "/merchant.jpg" });
    expect(products.layoutVariant).toBe("3-col");
    expect(products.props).toEqual({ title: "My Drop", source: "featured", limit: 6 });
  });

  it("uses preset suggestions only for missing fields", () => {
    const preset = getStorefrontLayoutPreset("fashion-culture-graphic")!;
    const current = [
      block({ id: "hero", type: "hero", sortOrder: 0 }),
      block({ id: "categories", type: "category-showcase", sortOrder: 1 }),
      block({ id: "products", type: "featured-products", sortOrder: 2, props: { title: "New", limit: 6 } }),
    ];

    const result = applyStorefrontLayoutPreset(current, preset);
    const products = result.blocks.find((item) => item.id === "products")!;

    expect(products.props).toEqual({ title: "New", limit: 6, source: "newest" });
  });

  it("adds only missing required sections with truth-safe content and skips missing optional sections", () => {
    const preset = getStorefrontLayoutPreset("fashion-editorial")!;
    const current = [block({ id: "hero", type: "hero", sortOrder: 0, props: { title: "Original" } })];

    const result = applyStorefrontLayoutPreset(current, preset);
    const trust = result.blocks.find((item) => item.type === "trust-badges");
    const story = result.blocks.find((item) => item.type === "rich-text");

    expect(result.addedSlotIds).toEqual(["collections", "story", "curated-products", "lookbook", "trust"]);
    expect(result.blocks.some((item) => item.type === "recently-viewed")).toBe(false);
    expect(result.blocks.some((item) => item.type === "faq-accordion")).toBe(false);
    expect(trust?.props).toEqual({});
    expect(story?.props).toEqual({ title: "Our story", body: "", align: "left" });
    expect(result.blocks.some((item) => item.type === "testimonials")).toBe(false);
    for (const item of result.blocks) expect(storePageBlockSchema.safeParse(item).success).toBe(true);
  });

  it("retains extra merchant sections after the preset flow and normalizes sort order", () => {
    const preset = getStorefrontLayoutPreset("fashion-boutique")!;
    const current = [
      block({ id: "custom-story", type: "rich-text", sortOrder: 0, props: { title: "Founder note", body: "Merchant copy", align: "left" } }),
      block({ id: "hero", type: "hero", sortOrder: 1 }),
      block({ id: "products", type: "featured-products", sortOrder: 2, props: { limit: 6 } }),
      block({ id: "categories", type: "category-showcase", sortOrder: 3 }),
    ];

    const result = applyStorefrontLayoutPreset(current, preset);

    expect(result.appendedExtraBlockIds).toContain("custom-story");
    expect(result.blocks.at(-1)?.id).toBe("custom-story");
    expect(result.blocks.map((item) => item.sortOrder)).toEqual(result.blocks.map((_, index) => index));
    expect(result.blocks.at(-1)?.props).toEqual({ title: "Founder note", body: "Merchant copy", align: "left" });
  });

  it("does not mutate the source blocks", () => {
    const preset = getStorefrontLayoutPreset("fashion-drop-streetwear")!;
    const current = [block({ id: "hero", type: "hero", sortOrder: 4, layoutVariant: "centered", props: { title: "Keep me" } })];
    const snapshot = structuredClone(current);

    applyStorefrontLayoutPreset(current, preset);

    expect(current).toEqual(snapshot);
  });
});
