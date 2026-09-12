import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "@/test/test-utils";
import type { Store, StorePageBlock } from "@/lib/cms/schema";
import { compositionPrimitiveIds } from "@/lib/cms/storefront-platform/composition/contracts";
import { createCompositionDocumentFromRecipe } from "@/lib/cms/storefront-platform/composition/recipes";
import { StoreContext } from "@/components/storefront/store-context";

process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||= "integration-test-key";

const assetRequire = createRequire(import.meta.url);
for (const extension of [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]) {
  assetRequire.extensions[extension] ??= (module: NodeJS.Module, filename: string) => {
    (module as NodeJS.Module & { exports: string }).exports = filename;
  };
}

const store: Store = {
  id: "store-1", name: "Demo", slug: "demo", description: "Demo store", currencyCode: "BDT", locale: "en-BD", isPublished: true,
  theme: { presetId: "default", mode: "light", customCssVars: {} },
  pages: [{ id: "home", slug: "/", title: "Home", isHomepage: true, blocks: [] }],
};

function recipeBlock(recipeId: string): Extract<StorePageBlock, { type: "composition" }> {
  const document = createCompositionDocumentFromRecipe(recipeId);
  return { id: recipeId, type: "composition", sortOrder: 0, isVisible: true, visible: true, props: { schemaVersion: document.schemaVersion, recipeId: document.recipeId, tree: document.tree } };
}function renderComposition(block: Extract<StorePageBlock, { type: "composition" }>) {
  const { StorefrontCompositionRenderer } = assetRequire("./StorefrontCompositionRenderer.tsx") as typeof import("@/components/storefront/platform/StorefrontCompositionRenderer");
  return renderToStaticMarkup(
    <StoreContext.Provider value={store}>
      <StorefrontCompositionRenderer block={block} />
    </StoreContext.Provider>,
  );
}

describe("integrated public Composition renderer", () => {
  it("renders both proof recipes through the same schema and renderer", async () => {
    const editorial = renderComposition(recipeBlock("editorial-story"));
    const promotion = renderComposition(recipeBlock("modern-promotion"));

    expect(editorial).toContain('data-storefront-composition="editorial-story"');
    expect(editorial).toContain("Made with a point of view");
    expect(editorial).toContain("grid grid-cols-1");
    expect(promotion).toContain('data-storefront-composition="modern-promotion"');
    expect(promotion).toContain("A sharper campaign section");
    expect(promotion).toContain('data-store-surface="true"');
  });

  it("fails closed when persisted Composition data violates the canonical schema", async () => {
    const invalid = recipeBlock("editorial-story") as any;
    invalid.props.tree = { ...invalid.props.tree, primitive: "arbitrary-script" };
    expect(renderComposition(invalid)).toBe("");
  });
  it("maps only registered primitives and exposes no arbitrary execution path", () => {
    const source = readFileSync("src/components/storefront/platform/StorefrontCompositionRenderer.tsx", "utf8");
    for (const primitive of compositionPrimitiveIds) {
      expect(source).toContain(`case "${primitive}"`);
    }
    expect(source).not.toContain("eval(");
    expect(source).not.toContain("new Function");
    expect(source).not.toContain("dangerouslySetInnerHTML");
    expect(source).toContain("compositionDocumentSchema.safeParse(block.props)");
  });
});