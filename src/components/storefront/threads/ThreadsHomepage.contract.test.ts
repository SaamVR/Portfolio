import { readFileSync } from "node:fs";
import { describe, expect, it } from "@/test/test-utils";

const rendererSource = readFileSync(
  "src/components/storefront/threads/ThreadsEditorialBlockRenderer.tsx",
  "utf8",
);
const headerSource = readFileSync(
  "src/components/storefront/threads/ThreadsHeader.tsx",
  "utf8",
);
const footerSource = readFileSync(
  "src/components/storefront/threads/ThreadsFooter.tsx",
  "utf8",
);

describe("Threads homepage behavior contracts", () => {
  it("keeps category and featured rails loop-capable whenever multiple items exist", () => {
    expect(rendererSource).toContain('loop: items.length > 1');
    expect(rendererSource).toContain('loop: visible.length > 1');
    expect(rendererSource).not.toContain('loop: items.length > 3');
    expect(rendererSource).not.toContain('loop: visible.length > 3');
  });


  it("keeps reference presentation tied to canonical catalog taxonomy", () => {
    expect(rendererSource).toContain("sourceItems\n          .slice(0, 5)");
    expect(rendererSource).not.toContain("const referenceLabels");
    expect(headerSource).toContain("useProductCategories(store?.id)");
    expect(headerSource).toContain("referenceCategoryNav");
    expect(headerSource).not.toContain('encodeURIComponent("Women")');
    expect(footerSource).toContain('{ label: "Shop all", url: shop }');
    expect(footerSource).not.toContain('label: "Home & Living"');
  });

  it("keeps visible carousel position controls touch-safe", () => {
    expect(rendererSource).toContain('className="grid h-11 min-w-11 place-items-center"');
    expect(rendererSource).toContain('aria-label={`Go to slide ${index + 1}`}');
  });

  it("keeps autoplay disabled for reduced-motion shoppers", () => {
    expect(rendererSource).toContain(
      'window.matchMedia("(prefers-reduced-motion: reduce)").matches',
    );
  });
});
