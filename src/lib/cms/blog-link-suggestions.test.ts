import { describe, expect, it } from "@/test/test-utils";
import { buildBlogInternalLinkSuggestions } from "@/lib/cms/blog-link-suggestions";
import type { BlogPostRecord } from "@/lib/cms/blog";

const makePost = (id: string, title: string, slug: string, extra: Partial<BlogPostRecord> = {}): BlogPostRecord => ({
  id,
  store_id: "store-1",
  title,
  slug,
  excerpt: "",
  content: "",
  featured_image: null,
  status: "published",
  seo_title: null,
  seo_description: null,
  published_at: "2026-08-01T00:00:00.000Z",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
  ...extra,
});

describe("Blog internal link suggestions", () => {
  it("ranks related published articles and excludes the current article", () => {
    const suggestions = buildBlogInternalLinkSuggestions({
      storeSlug: "demo-store",
      currentPostId: "current",
      title: "How to choose a travel backpack",
      category: "Buying Guides",
      tags: ["travel", "backpacks"],
      content: "Compare backpack capacity, straps, material, and airline use.",
      posts: [
        makePost("current", "Current", "current", { category: "Buying Guides" }),
        makePost("related", "Travel backpack size guide", "backpack-size-guide", { category: "Buying Guides", tags: ["travel", "backpacks"] }),
        makePost("draft", "Draft backpack guide", "draft", { status: "draft" }),
      ],
      products: [],
    });

    expect(suggestions[0]?.id).toBe("article:related");
    expect(suggestions[0]?.url).toBe("/stores/demo-store/blog/backpack-size-guide");
    expect(suggestions.some((suggestion) => suggestion.id === "article:current")).toBe(false);
    expect(suggestions.some((suggestion) => suggestion.id === "article:draft")).toBe(false);
  });

  it("prioritizes products already selected for the article", () => {
    const suggestions = buildBlogInternalLinkSuggestions({
      storeSlug: "demo-store",
      title: "Everyday backpack guide",
      content: "Choose an everyday backpack for work and travel.",
      embeddedProductIds: ["product-2"],
      posts: [],
      products: [
        { id: "product-1", name: "Travel Backpack", is_available: true },
        { id: "product-2", name: "Office Backpack", is_available: true },
      ],
    });

    expect(suggestions[0]?.id).toBe("product:product-2");
    expect(suggestions[0]?.url.includes("/stores/demo-store/product/office-backpack--product-2")).toBe(true);
  });
});
