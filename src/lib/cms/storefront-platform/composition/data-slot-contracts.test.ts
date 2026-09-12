import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StorePageBlock } from "@/lib/cms/schema";
import {
  COMPOSITION_SCHEMA_VERSION,
  compositionBindingFields,
} from "@/lib/cms/storefront-platform/composition/contracts";
import {
  adaptStorePageBlockToCompositionDataSlots,
  collectCompositionDataSlotRequests,
} from "@/lib/cms/storefront-platform/composition/data-slot-adapters";
import {
  compositionDataSlotRegistry,
  validateCompositionDataSlotPayload,
  validateCompositionDataSlotSelection,
} from "@/lib/cms/storefront-platform/composition/data-slot-contracts";
import { compositionDocumentSchema } from "@/lib/cms/storefront-platform/composition/schema";

describe("composition data-slot contracts", () => {
  it("defines bounded normalized slots with only approved binding fields", () => {
    const ids = new Set<string>();
    for (const contract of compositionDataSlotRegistry) {
      assert.equal(ids.has(contract.id), false, `duplicate slot: ${contract.id}`);
      ids.add(contract.id);
      assert.ok(contract.maxItems >= 1 && contract.maxItems <= 24);
      assert.ok(contract.allowedSources.length > 0);
      assert.ok(contract.fields.length > 0);
      assert.ok(contract.fields.every((field) => compositionBindingFields.includes(field)));
      assert.equal(contract.version, 1);
    }
  });

  it("rejects unsupported source modes and unsafe normalized payload fields", () => {
    assert.equal(validateCompositionDataSlotSelection("categories", "featured", 6).success, false);
    assert.equal(validateCompositionDataSlotSelection("featured-products", "featured", 6).success, true);

    assert.equal(validateCompositionDataSlotPayload({
      slot: "products",
      items: [{ name: "Safe product", href: "/product/safe" }],
    }).success, true);
    assert.equal(validateCompositionDataSlotPayload({
      slot: "products",
      items: [{ href: "javascript:alert(1)" }],
    }).success, false);
    assert.equal(validateCompositionDataSlotPayload({
      slot: "faq",
      items: [{ name: "Not an FAQ field" }],
    }).success, false);
  });

  it("adapts existing blocks into normalized requests without fetching data", () => {
    const featured = {
      id: "featured",
      type: "featured-products",
      sortOrder: 0,
      isVisible: true,
      visible: true,
      props: { limit: 8, source: "category", category: "shirts" },
    } as StorePageBlock;
    const testimonials = {
      id: "reviews",
      type: "testimonials",
      sortOrder: 1,
      isVisible: true,
      visible: true,
      props: { source: "live", limit: 6, reviews: [] },
    } as StorePageBlock;

    assert.deepEqual(adaptStorePageBlockToCompositionDataSlots(featured), [{
      nodeId: "featured",
      slot: "featured-products",
      source: "category",
      limit: 8,
      filters: { category: "shirts" },
    }]);
    assert.equal(adaptStorePageBlockToCompositionDataSlots(testimonials)[0]?.source, "live");
  });

  it("collects authored data slots and enforces slot-specific binding fields", () => {
    const valid = {
      schemaVersion: COMPOSITION_SCHEMA_VERSION,
      tree: {
        id: "root",
        primitive: "section",
        props: { width: "contained", padding: "comfortable", tone: "default" },
        children: [{
          id: "products-slot",
          primitive: "data-slot",
          props: { slot: "products", source: "featured-or-all", limit: 4 },
          children: [{
            id: "product-name",
            primitive: "text",
            props: {
              text: { kind: "binding", slotId: "products-slot", field: "name", fallback: "Product" },
              style: "body",
              align: "left",
            },
          }],
        }],
      },
    };

    assert.equal(compositionDocumentSchema.safeParse(valid).success, true);
    assert.deepEqual(collectCompositionDataSlotRequests(compositionDocumentSchema.parse(valid)), [{
      nodeId: "products-slot",
      slot: "products",
      source: "featured-or-all",
      limit: 4,
    }]);

    const invalidField = structuredClone(valid);
    const boundText = invalidField.tree.children[0]?.children?.[0]?.props.text as { field: string };
    boundText.field = "question";
    assert.equal(compositionDocumentSchema.safeParse(invalidField).success, false);
  });
});
