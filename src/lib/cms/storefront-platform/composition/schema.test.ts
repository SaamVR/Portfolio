import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPOSITION_LIMITS,
  COMPOSITION_SCHEMA_VERSION,
  type CompositionNode,
} from "@/lib/cms/storefront-platform/composition/contracts";
import { createDefaultCompositionDocument } from "@/lib/cms/storefront-platform/composition/defaults";
import { compositionDocumentSchema } from "@/lib/cms/storefront-platform/composition/schema";

describe("composition document schema", () => {
  it("accepts the bounded default composition document", () => {
    const parsed = compositionDocumentSchema.parse(createDefaultCompositionDocument());
    assert.equal(parsed.schemaVersion, COMPOSITION_SCHEMA_VERSION);
    assert.equal(parsed.tree.primitive, "section");
  });

  it("rejects unsupported composition schema versions", () => {
    const document = createDefaultCompositionDocument() as unknown as Record<string, unknown>;
    document.schemaVersion = COMPOSITION_SCHEMA_VERSION + 1;

    assert.equal(compositionDocumentSchema.safeParse(document).success, false);
  });

  it("rejects unknown primitives and arbitrary primitive props", () => {
    const unknownPrimitive = createDefaultCompositionDocument() as unknown as Record<string, unknown>;
    const unknownTree = unknownPrimitive.tree as Record<string, unknown>;
    unknownTree.primitive = "javascript";
    assert.equal(compositionDocumentSchema.safeParse(unknownPrimitive).success, false);

    const arbitraryProp = createDefaultCompositionDocument();
    arbitraryProp.tree.props = { width: "contained", padding: "comfortable", tone: "default", arbitraryCss: "position:fixed" };
    assert.equal(compositionDocumentSchema.safeParse(arbitraryProp).success, false);
  });

  it("rejects unsafe CTA protocols", () => {
    const document = createDefaultCompositionDocument();
    document.tree.children = [{
      id: "actions",
      primitive: "cta-group",
      props: {
        align: "left",
        actions: [{ label: "Run", href: "javascript:alert(1)", style: "primary" }],
      },
    }];

    assert.equal(compositionDocumentSchema.safeParse(document).success, false);
  });

  it("enforces depth and total-node complexity limits", () => {
    const deepDocument = createDefaultCompositionDocument();
    let cursor: CompositionNode = deepDocument.tree;
    for (let index = 1; index <= COMPOSITION_LIMITS.maxDepth; index += 1) {
      const child: CompositionNode = {
        id: `depth-${index}`,
        primitive: "container",
        props: { width: "content", align: "center" },
        children: [],
      };
      cursor.children = [child];
      cursor = child;
    }
    assert.equal(compositionDocumentSchema.safeParse(deepDocument).success, false);

    const wideDocument = createDefaultCompositionDocument();
    wideDocument.tree.children = Array.from({ length: 6 }, (_, groupIndex) => ({
      id: `group-${groupIndex}`,
      primitive: "container" as const,
      props: { width: "content", align: "center" },
      children: Array.from({ length: 11 }, (_, itemIndex) => ({
        id: `item-${groupIndex}-${itemIndex}`,
        primitive: "text" as const,
        props: { text: "Item", style: "body", align: "left" },
      })),
    }));
    assert.equal(compositionDocumentSchema.safeParse(wideDocument).success, false);
  });

  it("rejects duplicate ids and bindings to missing data slots", () => {
    const duplicateDocument = createDefaultCompositionDocument();
    duplicateDocument.tree.children = [
      { id: "same", primitive: "text", props: { text: "One", style: "body", align: "left" } },
      { id: "same", primitive: "text", props: { text: "Two", style: "body", align: "left" } },
    ];
    assert.equal(compositionDocumentSchema.safeParse(duplicateDocument).success, false);

    const bindingDocument = createDefaultCompositionDocument();
    bindingDocument.tree.children = [{
      id: "bound-heading",
      primitive: "heading",
      props: {
        text: { kind: "binding", slotId: "missing-products", field: "title", fallback: "Products" },
        level: "h2",
        align: "left",
        emphasis: "normal",
      },
    }];
    assert.equal(compositionDocumentSchema.safeParse(bindingDocument).success, false);
  });
});
