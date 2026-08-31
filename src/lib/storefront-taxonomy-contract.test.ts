import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readStorefrontTaxonomySnapshot } from "@/lib/storefront-taxonomy-snapshot";

function read(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

const showcase = read("components/CategoryShowcase.tsx");
const categoryHook = read("hooks/useProductCategories.ts");
const typeHook = read("hooks/useProductTypes.ts");
const resolver = read("lib/cms/store-resolver.ts");

test("server-authored storefront taxonomy snapshot normalizes only minimal browsing fields", () => {
  const snapshot = readStorefrontTaxonomySnapshot({
    storefront_taxonomy: {
      categories: [{ id: "cat-2", name: "Accessories", sort_order: 2, secret: "drop-me" }],
      types: [{ id: "type-1", name: "T-Shirt", sort_order: 1, metric_schema: [{ key: "private" }] }],
    },
  });

  assert.deepEqual(snapshot, {
    categories: [{ id: "cat-2", name: "Accessories", sort_order: 2 }],
    types: [{ id: "type-1", name: "T-Shirt", sort_order: 1 }],
  });
  assert.deepEqual(readStorefrontTaxonomySnapshot({ storefront_taxonomy: { categories: [], types: [] } }), {
    categories: [],
    types: [],
  });
});

test("store resolver preloads minimal protected taxonomy through the server boundary", () => {
  assert.match(resolver, /\.from\("product_categories"\)[\s\S]*?\.select\("id, name, sort_order"\)/);
  assert.match(resolver, /\.from\("product_types"\)[\s\S]*?\.select\("id, name, sort_order"\)/);
  assert.match(resolver, /STOREFRONT_TAXONOMY_SETTING_KEY/);
  assert.doesNotMatch(resolver, /metric_schema[^\n]*storefront_taxonomy/);
});

test("public category showcase consumes shared taxonomy hooks instead of direct Supabase reads", () => {
  assert.match(showcase, /useProductCategories\(storeId\)/);
  assert.match(showcase, /useProductTypes\(storeId\)/);
  assert.doesNotMatch(showcase, /integrations\/supabase\/client/);
  assert.doesNotMatch(showcase, /\.from\("product_types"\)/);
  assert.doesNotMatch(showcase, /window\.fetch/);
});

test("scoped taxonomy hooks prefer the server snapshot before protected-table fallback", () => {
  for (const [name, source, expected] of [
    ["categories", categoryHook, "scopedCategories"],
    ["types", typeHook, "scopedTypes"],
  ] as const) {
    const scopedBranch = source.indexOf("if (hasScopedStore)");
    const protectedRead = source.indexOf('.from("product_');
    assert.ok(scopedBranch >= 0, `${name} hook must have a scoped storefront branch`);
    assert.ok(protectedRead > scopedBranch, `${name} hook must resolve the scoped snapshot before database fallback`);
    assert.match(source, new RegExp(`return ${expected}`));
    assert.match(source, /storefront-snapshot/);
  }
});
