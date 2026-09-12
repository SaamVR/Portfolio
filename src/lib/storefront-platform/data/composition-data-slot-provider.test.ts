import { describe, expect, it } from "@/test/test-utils";
import type { Product } from "@/data/products";
import type { Store } from "@/lib/cms/schema";
import { buildCompositionDataSlotPayload } from "@/lib/storefront-platform/data/composition-data-slot-provider";
import type { CompositionDataSlotRequest } from "@/lib/cms/storefront-platform/composition/data-slot-contracts";

const products: Product[] = [
  { id: "p1", name: "Alpha Tee", price: 500, image: "/alpha.jpg", images: [], description: "", sizes: [], colors: [], category: "Tees", type: "T-Shirt", featured: true, badge: "New" },
  { id: "p2", name: "Beta Mug", price: 300, image: "/beta.jpg", images: [], description: "", sizes: [], colors: [], category: "Home", type: "Mug", featured: false },
];

const store: Store = {
  id: "store-1", name: "Demo", slug: "demo", description: "Demo store", currencyCode: "BDT", locale: "en-BD", isPublished: true,
  theme: { presetId: "default", mode: "light", customCssVars: {} },
  pages: [{ id: "home", slug: "/", title: "Home", isHomepage: true, blocks: [
    { id: "story", type: "rich-text", sortOrder: 0, isVisible: true, visible: true, props: { title: "Our story", body: "Made locally", align: "left" } },
    { id: "reviews", type: "testimonials", sortOrder: 1, isVisible: true, visible: true, props: { reviews: [{ name: "Sam", rating: 5, comment: "Great" }] } },
    { id: "faq", type: "faq-accordion", sortOrder: 2, isVisible: true, visible: true, props: { faqs: [{ q: "Shipping?", a: "Fast." }] } },
  ] }],
};function request(slot: CompositionDataSlotRequest["slot"], source: CompositionDataSlotRequest["source"] = "default", limit = 6): CompositionDataSlotRequest {
  return { nodeId: `${slot}-node`, slot, source, limit };
}

describe("integration composition data-slot provider", () => {
  it("normalizes product and category data through the canonical payload contract", () => {
    const featured = buildCompositionDataSlotPayload(request("featured-products", "featured", 6), { products, store });
    expect(featured.items).toHaveLength(1);
    expect(featured.items[0]).toMatchObject({ title: "Alpha Tee", href: "/stores/demo/product/alpha-tee--p1", label: "New" });

    const categories = buildCompositionDataSlotPayload(request("categories", "default", 6), { products, store });
    expect(categories.items).toHaveLength(2);
    expect(categories.items[0]).toMatchObject({ title: "Tees", href: "/stores/demo/shop?category=Tees" });
  });

  it("projects existing store content without creating a second fetch path", () => {
    expect(buildCompositionDataSlotPayload(request("content", "manual", 1), { products, store }).items[0]).toMatchObject({ title: "Our story", body: "Made locally" });
    expect(buildCompositionDataSlotPayload(request("testimonials", "manual", 6), { products, store }).items[0]).toMatchObject({ name: "Sam", rating: 5, body: "Great" });
    expect(buildCompositionDataSlotPayload(request("faq", "manual", 6), { products, store }).items[0]).toMatchObject({ question: "Shipping?", answer: "Fast." });
  });
});