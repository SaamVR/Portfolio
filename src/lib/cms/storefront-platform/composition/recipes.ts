import type { StoreBusinessFamily } from "@/lib/cms/storefront-template-seeds";
import {
  COMPOSITION_SCHEMA_VERSION,
  type CompositionDocument,
} from "@/lib/cms/storefront-platform/composition/contracts";
import { compositionDocumentSchema } from "@/lib/cms/storefront-platform/composition/schema";
import type {
  StorefrontInteractionRequirement,
  StorefrontPerformanceClass,
  StorefrontResponsiveContract,
  StorefrontVariantRequirements,
} from "@/lib/cms/storefront-platform/variants/contracts";

export interface CompositionRecipeDefinition {
  id: string;
  label: string;
  description: string;
  guidance: string;
  compatibleBusinessFamilies: readonly StoreBusinessFamily[];
  requiredCapabilities: readonly string[];
  recommendedTemplateIds: readonly string[];
  requirements: StorefrontVariantRequirements;
  safeFallbackRecipeId: string;
  responsive: StorefrontResponsiveContract;
  interactionRequirement: StorefrontInteractionRequirement;
  performanceClass: StorefrontPerformanceClass;
  document: CompositionDocument;
  version: 1;
}

const ALL_BUSINESS_FAMILIES: readonly StoreBusinessFamily[] = ["commerce", "booking", "listing", "service", "donation"];

const EDITORIAL_RESPONSIVE: StorefrontResponsiveContract = {
  mobile: { layout: "single-column", columns: 1, order: "media-first", overflow: "wrap" },
  tablet: { layout: "two-column", columns: 2, order: "media-first", overflow: "wrap" },
  desktop: { layout: "two-column", columns: 2, order: "media-first", overflow: "clip" },
};

const PROMOTIONAL_RESPONSIVE: StorefrontResponsiveContract = {
  mobile: { layout: "single-column", columns: 1, order: "content-first", overflow: "wrap" },
  tablet: { layout: "two-column", columns: 2, order: "content-first", overflow: "wrap" },
  desktop: { layout: "two-column", columns: 2, order: "content-first", overflow: "clip" },
};

const editorialStoryDocument: CompositionDocument = {
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  recipeId: "editorial-story",
  tree: {
    id: "editorial-story-section",
    primitive: "section",
    props: { width: "wide", padding: "spacious", tone: "default" },
    children: [
      {
        id: "editorial-decoration",
        primitive: "decorative-layer",
        props: { kind: "line", placement: "top-right", tone: "accent", intensity: "low" },
      },
      {
        id: "editorial-container",
        primitive: "container",
        props: { width: "wide", align: "center" },
        children: [
          {
            id: "editorial-columns",
            primitive: "columns",
            props: { ratio: "3:2", mobileOrder: "source", gap: "xl" },
            children: [
              {
                id: "editorial-media",
                primitive: "image",
                props: {
                  src: "/images/storefront/editorial-story-placeholder.jpg",
                  alt: "Editorial story media",
                  aspect: "4:5",
                  fit: "cover",
                  focalPoint: "center",
                },
              },
              {
                id: "editorial-story-panel",
                primitive: "panel",
                props: { tone: "muted", border: "subtle", radius: "lg", elevation: "none", padding: "spacious" },
                children: [
                  {
                    id: "editorial-story-stack",
                    primitive: "stack",
                    props: { gap: "md", align: "stretch" },
                    children: [
                      {
                        id: "editorial-badge",
                        primitive: "badge",
                        props: { text: "Our story", tone: "accent" },
                      },
                      {
                        id: "editorial-heading",
                        primitive: "heading",
                        props: { text: "Made with a point of view", level: "h2", align: "left", emphasis: "display" },
                      },
                      {
                        id: "editorial-copy",
                        primitive: "text",
                        props: { text: "Pair large-format media with a focused narrative panel, then lead shoppers to the next meaningful destination.", style: "lead", align: "left" },
                      },
                      {
                        id: "editorial-actions",
                        primitive: "cta-group",
                        props: { align: "left", actions: [{ label: "Read the story", href: "/about", style: "primary" }] },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

const modernPromotionDocument: CompositionDocument = {
  schemaVersion: COMPOSITION_SCHEMA_VERSION,
  recipeId: "modern-promotion",
  tree: {
    id: "modern-promotion-section",
    primitive: "section",
    props: { width: "wide", padding: "spacious", tone: "accent" },
    children: [
      {
        id: "promotion-container",
        primitive: "container",
        props: { width: "wide", align: "center" },
        children: [
          {
            id: "promotion-columns",
            primitive: "columns",
            props: { ratio: "2:1", mobileOrder: "reverse", gap: "lg" },
            children: [
              {
                id: "promotion-offer-surface",
                primitive: "surface",
                props: { tone: "inverse", border: "none", radius: "xl", elevation: "soft", padding: "spacious" },
                children: [
                  {
                    id: "promotion-content-stack",
                    primitive: "stack",
                    props: { gap: "md", align: "stretch" },
                    children: [
                      {
                        id: "promotion-badge",
                        primitive: "badge",
                        props: { text: "Limited offer", tone: "accent" },
                      },
                      {
                        id: "promotion-heading",
                        primitive: "heading",
                        props: { text: "A sharper campaign section", level: "h2", align: "left", emphasis: "display" },
                      },
                      {
                        id: "promotion-copy",
                        primitive: "text",
                        props: { text: "Use an asymmetric content-to-media balance, an accent surface, and two clear actions without inventing another backend block type.", style: "lead", align: "left" },
                      },
                      {
                        id: "promotion-actions",
                        primitive: "cta-group",
                        props: {
                          align: "left",
                          actions: [
                            { label: "Shop offer", href: "/shop", style: "primary" },
                            { label: "Learn more", href: "/about", style: "secondary" },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
              {
                id: "promotion-media-card",
                primitive: "card",
                props: { tone: "default", border: "none", radius: "xl", elevation: "raised", padding: "compact" },
                children: [
                  {
                    id: "promotion-media",
                    primitive: "image",
                    props: {
                      src: "/images/storefront/promotion-placeholder.jpg",
                      alt: "Promotional campaign media",
                      aspect: "3:2",
                      fit: "cover",
                      focalPoint: "center",
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "promotion-decoration",
        primitive: "decorative-layer",
        props: { kind: "gradient", placement: "bottom-right", tone: "contrast", intensity: "medium" },
      },
    ],
  },
};

export const compositionRecipeRegistry: readonly CompositionRecipeDefinition[] = [
  {
    id: "editorial-story",
    label: "Editorial story",
    description: "Large media paired with a story panel, badge, CTA, and restrained decoration.",
    guidance: "Use for brand, maker, collection, or process storytelling where one strong media asset is available.",
    compatibleBusinessFamilies: ALL_BUSINESS_FAMILIES,
    requiredCapabilities: [],
    recommendedTemplateIds: ["fashion", "threads", "crafts", "beauty"],
    requirements: { requiresPrimaryMedia: true, minMediaItems: 1 },
    safeFallbackRecipeId: "editorial-story",
    responsive: EDITORIAL_RESPONSIVE,
    interactionRequirement: "none",
    performanceClass: "media-heavy",
    document: editorialStoryDocument,
    version: 1,
  },
  {
    id: "modern-promotion",
    label: "Modern promotion",
    description: "Asymmetric offer composition with campaign media, multiple CTAs, and an accent surface.",
    guidance: "Use for time-bound campaigns or high-priority merchandising where two shopper actions are useful.",
    compatibleBusinessFamilies: ALL_BUSINESS_FAMILIES,
    requiredCapabilities: [],
    recommendedTemplateIds: ["electronics", "fashion", "beauty", "general-catalog"],
    requirements: { requiresPrimaryMedia: true, minMediaItems: 1 },
    safeFallbackRecipeId: "modern-promotion",
    responsive: PROMOTIONAL_RESPONSIVE,
    interactionRequirement: "none",
    performanceClass: "media-heavy",
    document: modernPromotionDocument,
    version: 1,
  },
] as const;

// Fail early during module initialization if a checked-in recipe drifts outside the
// canonical composition schema. Recipes are data, never alternate rendering code.
for (const recipe of compositionRecipeRegistry) {
  compositionDocumentSchema.parse(recipe.document);
}

export function getCompositionRecipe(id: string | null | undefined): CompositionRecipeDefinition | undefined {
  if (!id) return undefined;
  return compositionRecipeRegistry.find((recipe) => recipe.id === id);
}

export function getCompositionRecipeIds(): string[] {
  return compositionRecipeRegistry.map((recipe) => recipe.id);
}

export function createCompositionDocumentFromRecipe(id: string): CompositionDocument {
  const recipe = getCompositionRecipe(id);
  if (!recipe) {
    throw new Error(`Unknown composition recipe: ${id}`);
  }

  return structuredClone(recipe.document);
}
