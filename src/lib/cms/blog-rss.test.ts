import { describe, expect, it } from "@/test/test-utils";
import { buildBlogRssFeed, blogRssResponse } from "@/lib/cms/blog-rss";
import { defaultBlogSettings } from "@/lib/cms/blog-settings";
import type { BlogPostRecord } from "@/lib/cms/blog";

function post(overrides: Partial<BlogPostRecord> & Pick<BlogPostRecord, "id" | "title" | "slug">): BlogPostRecord {
  const { id, title, slug, ...rest } = overrides;
  return {
    store_id: "store-1",
    excerpt: "Useful article summary.",
    content: "Useful article content.",
    featured_image: null,
    status: "published",
    seo_title: null,
    seo_description: null,
    published_at: "2026-08-10T12:00:00.000Z",
    created_at: "2026-08-10T12:00:00.000Z",
    updated_at: "2026-08-11T12:00:00.000Z",
    ...rest,
    id,
    title,
    slug,
  };
}

describe("Blog RSS feed", () => {
  it("uses canonical store URLs and escapes merchant content", () => {
    const xml = buildBlogRssFeed({
      store: { name: "A & B <Store>", slug: "demo", customDomain: "shop.example.com", locale: "en-BD" },
      settings: { ...defaultBlogSettings, seoTitle: "Guides & Stories", seoDescription: "Advice <for> shoppers & customers." },
      posts: [post({ id: "1", title: "Fit & <Sizing>", slug: "fit-sizing", category: "Guides & Tips", tags: ["fit", "size"] })],
    });

    expect(xml.includes("<title>Guides &amp; Stories</title>")).toBe(true);
    expect(xml.includes("Advice &lt;for&gt; shoppers &amp; customers.")).toBe(true);
    expect(xml.includes("<title>Fit &amp; &lt;Sizing&gt;</title>")).toBe(true);
    expect(xml.includes("https://shop.example.com/blog/fit-sizing")).toBe(true);
    expect(xml.includes('href="https://shop.example.com/blog/rss.xml"')).toBe(true);
    expect(xml.includes("<category>Guides &amp; Tips</category>")).toBe(true);
  });

  it("excludes noindex, draft, and future-scheduled articles from syndication", () => {
    const xml = buildBlogRssFeed({
      store: { name: "Demo", slug: "demo", customDomain: "shop.example.com" },
      settings: defaultBlogSettings,
      posts: [
        post({ id: "public", title: "Public guide", slug: "public-guide" }),
        post({ id: "hidden", title: "Hidden guide", slug: "hidden-guide", noindex: true }),
        post({ id: "draft", title: "Draft guide", slug: "draft-guide", status: "draft" }),
        post({ id: "future", title: "Future guide", slug: "future-guide", published_at: "2099-01-01T00:00:00.000Z" }),
      ],
    });

    expect(xml.includes("Public guide")).toBe(true);
    expect(xml.includes("Hidden guide")).toBe(false);
    expect(xml.includes("Draft guide")).toBe(false);
    expect(xml.includes("Future guide")).toBe(false);
  });

  it("returns RSS content and cache headers", () => {
    const response = blogRssResponse("<rss></rss>");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("public, s-maxage=300, stale-while-revalidate=600");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
