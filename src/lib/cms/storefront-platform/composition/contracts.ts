export const COMPOSITION_SCHEMA_VERSION = 1 as const;

// These limits are intentionally conservative for a first mobile-first release.
// Existing catalog blocks already cap data-heavy item sets at 24; 64 total nodes
// leaves room for semantic wrappers and repeated item templates without allowing
// composition trees to become an unbounded DOM/configuration language.
export const COMPOSITION_LIMITS = {
  maxDepth: 6,
  maxNodes: 64,
  maxChildrenPerNode: 12,
  maxTextLength: 4000,
  maxRichTextParagraphs: 24,
  maxActions: 3,
  maxDataSlotItems: 24,
} as const;

export const compositionPrimitiveIds = [
  "section",
  "container",
  "stack",
  "row",
  "grid",
  "columns",
  "surface",
  "card",
  "panel",
  "heading",
  "text",
  "rich-text",
  "badge",
  "divider",
  "image",
  "media",
  "cta-group",
  "decorative-layer",
  "data-slot",
] as const;

export const compositionDataSlotIds = [
  "products",
  "featured-products",
  "categories",
  "content",
  "testimonials",
  "faq",
] as const;

export const compositionBindingFields = [
  "title",
  "subtitle",
  "body",
  "label",
  "name",
  "priceLabel",
  "imageUrl",
  "imageAlt",
  "href",
  "rating",
  "question",
  "answer",
] as const;

export type CompositionPrimitiveId = (typeof compositionPrimitiveIds)[number];
export type CompositionDataSlotId = (typeof compositionDataSlotIds)[number];
export type CompositionBindingField = (typeof compositionBindingFields)[number];

export interface CompositionBinding {
  kind: "binding";
  slotId: string;
  field: CompositionBindingField;
  fallback?: string;
}

export interface CompositionNode {
  id: string;
  primitive: CompositionPrimitiveId;
  props: Record<string, unknown>;
  children?: CompositionNode[];
}

export interface CompositionDocument {
  schemaVersion: typeof COMPOSITION_SCHEMA_VERSION;
  recipeId?: string;
  tree: CompositionNode;
}
