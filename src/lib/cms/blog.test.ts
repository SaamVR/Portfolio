import { describe, expect, it } from "@/test/test-utils";
import {
  buildBlogExcerpt,
  hasInlineBlogProducts,
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
