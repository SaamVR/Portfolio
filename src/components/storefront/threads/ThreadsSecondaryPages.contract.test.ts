import { readFileSync } from "node:fs";
import { describe, expect, it } from "@/test/test-utils";

const layoutSource = readFileSync("src/components/storefront/StorefrontLayout.tsx", "utf8");
const shopSource = readFileSync("src/components/storefront/threads/ThreadsShopPage.tsx", "utf8");
const productCardSource = readFileSync("src/components/storefront/threads/ThreadsProductCard.tsx", "utf8");
const productDetailSource = readFileSync("src/views/ProductDetail.tsx", "utf8");
const aboutSource = readFileSync("src/views/About.tsx", "utf8");
const contactSource = readFileSync("src/views/Contact.tsx", "utf8");
const wishlistSource = readFileSync("src/views/Wishlist.tsx", "utf8");
const faqSource = readFileSync("src/views/FAQ.tsx", "utf8");

describe("R3 Threads secondary storefront contracts", () => {
  it("reuses the specialized Threads shell without changing other secondary template shells", () => {
    expect(layoutSource).toContain('if (templateId === "threads")');
    expect(layoutSource).toContain("<StorefrontShellBoundary");
    expect(layoutSource).toContain("shellId={resolveStorefrontShell(template).id}");
    expect(layoutSource).toContain("<StorefrontShell templateId={templateId} template={template}>");
  });

  it("keeps catalog discovery presentation touch-safe and truth-driven", () => {
    expect(shopSource).toContain("useProducts(storeId)");
    expect(shopSource).toContain("useProductSearch(");
    expect(shopSource).toContain("useProductCategories(storeId)");
    expect(shopSource).toContain("min-h-11");
    expect(shopSource).toContain('aria-label="Loading collection"');
    expect(productCardSource).toContain("h-11 w-11");
  });

  it("provides Threads-specific editorial loading, empty, story, support and saved-item states", () => {
    expect(productDetailSource).toContain('aria-label="Loading product"');
    expect(productDetailSource).toContain("This piece is no longer here.");
    expect(aboutSource).toContain('const isThreads = templateId === "threads"');
    expect(aboutSource).toContain("Values with a point of view.");
    expect(contactSource).toContain('const isThreads = templateId === "threads"');
    expect(contactSource).toContain('id="threads-message"');
    expect(wishlistSource).toContain("<ThreadsProductCard");
    expect(faqSource).toContain("Questions, answered simply.");
  });
});
