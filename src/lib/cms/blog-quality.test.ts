import { describe, expect, it } from "@/test/test-utils";
import { buildBlogQualityReport } from "@/lib/cms/blog-quality";

describe("blog publish readiness", () => {
  it("scores a complete ecommerce article as ready", () => {
    const content = [
      "## What to compare",
      "Useful buying advice ".repeat(180),
      "## Materials and fit",
      "Practical product guidance ".repeat(160),
      "Read our [related guide](/blog/material-guide) and [shop the collection](/shop).",
    ].join("\n\n");

    const report = buildBlogQualityReport({
      title: "How to choose the right everyday travel backpack",
      slug: "choose-everyday-travel-backpack",
      excerpt: "Compare capacity, material, fit, organization, and comfort before choosing an everyday travel backpack for work, errands, and short trips.",
      content,
      featuredImage: "https://example.com/backpack.jpg",
      featuredImageAlt: "Black everyday travel backpack on a wooden bench",
      category: "Buying Guides",
      tags: ["backpacks", "travel"],
      embeddedProductIds: ["product-1"],
      seoTitle: "How to Choose an Everyday Travel Backpack",
      seoDescription: "Compare backpack capacity, fit, materials, organization, and comfort so you can choose the right everyday travel bag for work and short trips.",
      canonicalUrl: "",
      status: "published",
      noindex: false,
    });

    expect(report.score).toBe(100);
    expect(report.label).toBe("Ready to publish");
    expect(report.passedCount).toBe(report.totalCount);
    expect(report.wordCount > 300).toBe(true);
  });

  it("flags duplicate page H1 structure and missing commerce/discovery signals", () => {
    const report = buildBlogQualityReport({
      title: "Short post",
      slug: "Short Post",
      content: "# Another H1\n\nA short paragraph.",
      status: "published",
      noindex: true,
    });

    expect(report.score < 60).toBe(true);
    expect(report.checks.find((check) => check.id === "body-h1")?.passed).toBe(false);
    expect(report.checks.find((check) => check.id === "internal-link")?.passed).toBe(false);
    expect(report.checks.find((check) => check.id === "commerce-path")?.passed).toBe(false);
    expect(report.advisories.length > 0).toBe(true);
  });

  it("accepts a direct internal product link as an intentional commerce path", () => {
    const report = buildBlogQualityReport({
      title: "Complete guide to choosing running shoes",
      slug: "choosing-running-shoes",
      content: "## Fit\n\nChoose by foot shape. [See the shoe](/product/running-shoe--123).\n\n## Cushioning\n\nCompare the ride.",
    });

    expect(report.checks.find((check) => check.id === "internal-link")?.passed).toBe(true);
    expect(report.checks.find((check) => check.id === "commerce-path")?.passed).toBe(true);
  });
});
