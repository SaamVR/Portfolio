import { describe, expect, it } from "@/test/test-utils";
import { defaultStore } from "@/lib/cms/default-store";
import { buildStorePageMetadata, buildStoreProductMetadata, buildStoreShopMetadata } from "@/lib/cms/store-metadata";

describe("store metadata helpers", () => {
  it("uses CMS page SEO fields when they are present", () => {
    const page = {
      ...defaultStore.pages[0],
      seoTitle: "Custom Home Title",
      seoDescription: "Custom homepage description.",
    };

    const metadata = buildStorePageMetadata(defaultStore, page, `/stores/${defaultStore.slug}`);

    expect(metadata.title).toBe("Custom Home Title");
    expect(metadata.description).toBe("Custom homepage description.");
  });

  it("builds shop metadata from the store brand", () => {
    const metadata = buildStoreShopMetadata(defaultStore);

    expect(metadata.title).toBe(`Shop | ${defaultStore.name}`);
    expect(metadata.openGraph?.siteName).toBe(defaultStore.name);
  });

  it("builds product metadata with product image fallback", () => {
    const metadata = buildStoreProductMetadata(
      defaultStore,
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Launch Hoodie",
        description: "A clean product description.",
        price: 1200,
        image_url: "/hoodie.png",
        images: [],
        is_available: true,
      },
      "launch-hoodie--00000000-0000-4000-8000-000000000001",
    );

    expect(metadata.title).toBe(`Launch Hoodie | ${defaultStore.name}`);
    expect(metadata.description).toBe("A clean product description.");
  });
});
