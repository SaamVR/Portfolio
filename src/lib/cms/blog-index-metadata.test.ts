import { describe, expect, it } from "@/test/test-utils";
import { buildBlogIndexMetadata, resolveBlogIndexFilter } from "@/lib/cms/blog-index-metadata";
import { defaultBlogSettings } from "@/lib/cms/blog-settings";

describe("Blog filtered metadata", () => {
  const store = { name: "Demo Store", slug: "demo", customDomain: "shop.example.com" };

  it("gives category views a stable filtered canonical", () => {
    const metadata = buildBlogIndexMetadata({
      store,
      settings: defaultBlogSettings,
      filters: { category: "Buying Guides" },
    });

    expect(String(metadata.alternates?.canonical)).toBe("https://shop.example.com/blog?category=Buying+Guides");
    expect(String(metadata.title).includes("Buying Guides")).toBe(true);
  });

  it("gives tag views their own canonical", () => {
    const metadata = buildBlogIndexMetadata({
      store,
      settings: defaultBlogSettings,
      filters: { tag: "travel bags" },
    });

    expect(String(metadata.alternates?.canonical)).toBe("https://shop.example.com/blog?tag=travel+bags");
    expect(String(metadata.title).includes("#travel bags")).toBe(true);
  });

  it("keeps onsite search canonicalized to the Blog root and noindexes it", () => {
    const metadata = buildBlogIndexMetadata({
      store,
      settings: defaultBlogSettings,
      filters: { q: "carry on" },
    });
    const robots = metadata.robots as { index?: boolean; follow?: boolean } | undefined;

    expect(String(metadata.alternates?.canonical)).toBe("https://shop.example.com/blog");
    expect(robots?.index).toBe(false);
    expect(robots?.follow).toBe(true);
  });

  it("prioritizes category, then tag, then search consistently", () => {
    expect(resolveBlogIndexFilter({ category: "Guides", tag: "Travel", q: "bag" })).toEqual({ type: "category", value: "Guides" });
    expect(resolveBlogIndexFilter({ tag: "Travel", q: "bag" })).toEqual({ type: "tag", value: "Travel" });
    expect(resolveBlogIndexFilter({ q: "bag" })).toEqual({ type: "search", value: "bag" });
  });
});
