import { describe, expect, it } from "@/test/test-utils";
import { scopeStoreThemeCss } from "@/lib/cms/theme-css";

describe("scopeStoreThemeCss", () => {
  it("prefixes plain selectors into the provided scope", () => {
    const scoped = scopeStoreThemeCss(".hero, .cta { color: red; }", '[data-store-theme-scope="abc"]');

    expect(scoped.includes('[data-store-theme-scope="abc"] .hero')).toBe(true);
    expect(scoped.includes('[data-store-theme-scope="abc"] .cta')).toBe(true);
  });

  it("replaces :root selectors and scopes nested media rules", () => {
    const scoped = scopeStoreThemeCss(
      ":root { --brand: #fff; } @media (min-width: 768px) { .hero { padding: 2rem; } }",
      '[data-store-theme-scope="abc"]',
    );

    expect(scoped.includes(":root")).toBe(false);
    expect(scoped.includes("@media (min-width: 768px)")).toBe(true);
    expect(scoped.includes('[data-store-theme-scope="abc"] .hero')).toBe(true);
  });

  it("keeps keyframes unscoped", () => {
    const scoped = scopeStoreThemeCss("@keyframes pulse { 0% { opacity: 0; } 100% { opacity: 1; } }", '[data-store-theme-scope="abc"]');

    expect(scoped.includes("@keyframes pulse")).toBe(true);
    expect(scoped.includes('[data-store-theme-scope="abc"] @keyframes')).toBe(false);
  });
});
