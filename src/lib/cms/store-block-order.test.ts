import { describe, expect, it } from "@/test/test-utils";
import { sanitizeStoreBlocks } from "@/lib/cms/validation";

describe("store block order sanitization", () => {
  it("preserves persisted sortOrder when database rows arrive out of order", () => {
    const blocks = sanitizeStoreBlocks([
      {
        id: "category",
        type: "category-showcase",
        props: {},
        sortOrder: 1,
        isVisible: true,
        visible: true,
      },
      {
        id: "featured",
        type: "featured-products",
        props: { limit: 6 },
        sortOrder: 2,
        isVisible: true,
        visible: true,
      },
      {
        id: "hero",
        type: "hero",
        props: { title: "Hero" },
        sortOrder: 0,
        isVisible: true,
        visible: true,
      },
    ]);

    expect(blocks.map((block) => block.type)).toEqual([
      "hero",
      "category-showcase",
      "featured-products",
    ]);
    expect(blocks.map((block) => block.sortOrder)).toEqual([0, 1, 2]);
  });
});
