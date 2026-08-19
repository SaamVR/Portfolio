import { describe, expect, it } from "@/test/test-utils";
import {
  buildBlogExcerpt,
  extractBlogHeadings,
  hasInlineBlogProducts,
  markdownToHtml,
  splitBlogContentAtProductDirectives,
} from "@/lib/cms/blog";

describe("blog inline commerce directives", () => {
  it("detects and splits inline product placement", () => {
    const content = "Intro paragraph.\n\n[[products]]\n\nBuying advice after products.";
    expect(hasInlineBlogProducts(content)).toBe(true);
    expect(splitBlogContentAtProductDirectives(content)).toEqual([
      "Intro paragraph.\n\n",
      "\n\nBuying advice after products.",
    ]);
  });

  it("keeps product directives out of automatic excerpts", () => {
    expect(buildBlogExcerpt("Useful intro.\n\n[[products]]\n\nUseful ending.")).toBe("Useful intro. Useful ending.");
  });
});

describe("blog table of contents", () => {
  it("extracts H2/H3 headings and creates matching anchor ids", () => {
    const content = "# Article title\n\n## What to compare\n\n### Fit & sizing\n\n## Final choice";
    expect(extractBlogHeadings(content)).toEqual([
      { level: 2, text: "What to compare", id: "section-what-to-compare" },
      { level: 3, text: "Fit & sizing", id: "section-fit-sizing" },
      { level: 2, text: "Final choice", id: "section-final-choice" },
    ]);

    const html = markdownToHtml(content);
    expect(html.includes('<h2 id="section-what-to-compare">What to compare</h2>')).toBe(true);
    expect(html.includes('<h3 id="section-fit-sizing">Fit &amp; sizing</h3>')).toBe(true);
  });

  it("keeps duplicate heading anchors out of the generated contents list", () => {
    const content = "## Details\n\nText.\n\n## Details\n\nMore text.";
    expect(extractBlogHeadings(content)).toEqual([
      { level: 2, text: "Details", id: "section-details" },
    ]);
  });
});

describe("blog markdown links", () => {
  it("renders safe relative storefront links without forcing a new tab", () => {
    const html = markdownToHtml("Read the [size guide](/blog/size-guide) or [shop](/shop?fit=travel).");
    expect(html.includes('<a href="/blog/size-guide">size guide</a>')).toBe(true);
    expect(html.includes('<a href="/shop?fit=travel">shop</a>')).toBe(true);
  });

  it("does not turn protocol-relative links into anchors", () => {
    const html = markdownToHtml("Do not render [unsafe](//example.com/path).");
    expect(html.includes('<a href="//example.com/path">')).toBe(false);
  });
});
