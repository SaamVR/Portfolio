import { describe, expect, it } from "@/test/test-utils";
import { blogArticleTemplates, getBlogArticleTemplate } from "@/lib/cms/blog-templates";

describe("ecommerce Blog article templates", () => {
  it("ships five distinct reusable editorial structures", () => {
    expect(blogArticleTemplates).toHaveLength(5);
    expect(new Set(blogArticleTemplates.map((template) => template.id)).size).toBe(5);
  });

  it("starts article bodies at H2 because the page title owns H1", () => {
    const hasBodyH1 = blogArticleTemplates.some((template) =>
      template.content.split(/\r?\n/).some((line) => /^#\s+/.test(line.trim())),
    );
    expect(hasBodyH1).toBe(false);
  });

  it("provides taxonomy, commerce placement, and SEO drafting hints", () => {
    for (const template of blogArticleTemplates) {
      expect(template.category.length > 0).toBe(true);
      expect(template.tags.length >= 2).toBe(true);
      expect(template.content.includes("[[products]]")).toBe(true);
      expect(template.productEmbedTitle.length > 0).toBe(true);
      expect(template.seoTitleHint.length > 0).toBe(true);
      expect(template.seoDescriptionHint.length > 0).toBe(true);
    }
  });

  it("resolves templates by stable id", () => {
    expect(getBlogArticleTemplate("buying-guide")?.title).toBe("Buying guide");
    expect(getBlogArticleTemplate("collection-story")?.category).toBe("Collections");
  });
});
