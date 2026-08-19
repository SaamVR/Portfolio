import { describe, expect, it } from "@/test/test-utils";
import {
  buildBlogExcerpt,
  extractBlogHeadings,
  getPrimaryBlogProductDirective,
  hasInlineBlogProducts,
  markdownToHtml,
  parseBlogProductDirective,
  serializeBlogProductDirective,
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

  it("detects parameterized directives repeatedly without regex state leakage", () => {
    const content = "Intro.\n\n[[products source=featured limit=6]]\n\nEnding.";
    expect(hasInlineBlogProducts(content)).toBe(true);
    expect(hasInlineBlogProducts(content)).toBe(true);
    expect(hasInlineBlogProducts(content)).toBe(true);
    expect(splitBlogContentAtProductDirectives(content)).toEqual([
      "Intro.\n\n",
      "\n\nEnding.",
    ]);
  });

  it("parses and serializes dynamic product source configuration", () => {
    expect(parseBlogProductDirective("[[products source=category category=Travel%20Bags limit=6]]")).toEqual({
      source: "category",
      category: "Travel Bags",
      limit: 6,
    });
    expect(serializeBlogProductDirective({ source: "category", category: "Travel Bags", limit: 6 }))
      .toBe("[[products source=category category=Travel%20Bags limit=6]]");
    expect(getPrimaryBlogProductDirective("Before\n\n[[products source=bestsellers limit=5]]\n\nAfter")).toEqual({
      source: "bestsellers",
      limit: 5,
    });
  });

  it("keeps the legacy directive as the manual backward-compatible default", () => {
    expect(parseBlogProductDirective("[[products]]")).toEqual({ source: "manual", limit: 4 });
    expect(serializeBlogProductDirective()).toBe("[[products]]");
  });

  it("clamps invalid limits and falls back unknown sources to manual", () => {
    expect(parseBlogProductDirective("[[products source=unknown limit=99]]")).toEqual({
      source: "manual",
      limit: 8,
    });
    expect(parseBlogProductDirective("[[products source=newest limit=0]]")).toEqual({
      source: "newest",
      limit: 1,
    });
  });

  it("keeps product directives out of automatic excerpts", () => {
    expect(buildBlogExcerpt("Useful intro.\n\n[[products source=related limit=5]]\n\nUseful ending."))
      .toBe("Useful intro. Useful ending.");
  });

  it("renders product directives as preview placeholders instead of article text", () => {
    const html = markdownToHtml("Before.\n\n[[products source=sale limit=4]]\n\nAfter.");
    expect(html.includes("Product cards render here.")).toBe(true);
    expect(html.includes("source=sale")).toBe(false);
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

describe("blog markdown comparison tables", () => {
  it("renders a header and body rows inside a mobile overflow wrapper", () => {
    const html = markdownToHtml([
      "| Factor | Option A | Option B |",
      "| --- | --- | --- |",
      "| Best for | Travel | Office |",
      "| Price | ৳2,000 | ৳2,500 |",
    ].join("\n"));

    expect(html.includes('<div class="overflow-x-auto">')).toBe(true);
    expect(html.includes("<table>")).toBe(true);
    expect(html.includes('<th scope="col">Factor</th>')).toBe(true);
    expect(html.includes("<td>Travel</td>")).toBe(true);
    expect(html.includes("<td>৳2,500</td>")).toBe(true);
  });

  it("supports safe inline formatting and links inside cells", () => {
    const html = markdownToHtml([
      "| Choice | Details |",
      "| --- | --- |",
      "| **A** | [See product](/product/example--1) |",
    ].join("\n"));

    expect(html.includes("<strong>A</strong>")).toBe(true);
    expect(html.includes('<a href="/product/example--1">See product</a>')).toBe(true);
  });

  it("escapes raw HTML inside table cells", () => {
    const html = markdownToHtml([
      "| Choice | Details |",
      "| --- | --- |",
      "| A | <script>alert(1)</script> |",
    ].join("\n"));

    expect(html.includes("<script>")).toBe(false);
    expect(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe(true);
  });

  it("does not treat pipe text as a table without a valid separator", () => {
    const html = markdownToHtml("Factor | Option A | Option B\nnot a separator");
    expect(html.includes("<table>")).toBe(false);
  });
});
