import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StorePageBlock } from "@/lib/cms/schema";
import { getStorefrontTemplateDefinition } from "@/lib/cms/storefront-templates";
import { getStorefrontVariantDefinition } from "./registry";
import { shouldUseSpecializedBlockRenderer } from "./specialized-routing";

function block(type: StorePageBlock["type"], layoutVariant?: string): StorePageBlock {
  return { id: `${type}-1`, type, sortOrder: 0, isVisible: true, visible: true, layoutVariant, props: {} } as StorePageBlock;
}

describe("specialized storefront style routing", () => {
  it("keeps template defaults specialized but routes shared style changes through the shared renderer", () => {
    const threads = getStorefrontTemplateDefinition("threads");
    assert.equal(shouldUseSpecializedBlockRenderer(block("hero", "split"), threads), true);
    assert.equal(shouldUseSpecializedBlockRenderer(block("hero", "centered"), threads), false);
    assert.equal(shouldUseSpecializedBlockRenderer(block("promo-banner", "dual-editorial"), threads), true);

    const fashion = getStorefrontTemplateDefinition("fashion");
    assert.equal(shouldUseSpecializedBlockRenderer(block("hero", "poster"), fashion), true);
    assert.equal(shouldUseSpecializedBlockRenderer(block("hero", "split"), fashion), false);
  });

  it("keeps every declared Threads style default registered", () => {
    const threads = getStorefrontTemplateDefinition("threads");
    for (const [type, variantId] of Object.entries(threads.presentation.blockLayoutVariants ?? {})) {
      assert.ok(getStorefrontVariantDefinition(type as StorePageBlock["type"], variantId), `${type}:${variantId}`);
    }
  });
});
