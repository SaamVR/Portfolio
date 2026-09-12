import type { StoreBusinessFamily } from "@/lib/cms/storefront-template-seeds";
import type { StorePageBlock } from "@/lib/cms/schema";

export type StorefrontPerformanceClass = "light" | "standard" | "media-heavy" | "interactive";
export type StorefrontInteractionRequirement = "none" | "optional" | "carousel" | "accordion" | "video";
export type StorefrontBreakpointLayout = "single-column" | "stack" | "two-column" | "grid" | "horizontal-scroll" | "preserve";
export type StorefrontContentOrder = "source" | "media-first" | "content-first";

export interface StorefrontBreakpointContract {
  layout: StorefrontBreakpointLayout;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  order?: StorefrontContentOrder;
  overflow?: "clip" | "wrap" | "scroll-x";
}

export interface StorefrontResponsiveContract {
  mobile: StorefrontBreakpointContract;
  tablet: StorefrontBreakpointContract;
  desktop: StorefrontBreakpointContract;
}

export interface StorefrontVariantRequirements {
  minItems?: number;
  minMediaItems?: number;
  requiresPrimaryMedia?: boolean;
}

export interface StorefrontVariantRecommendation {
  businessFamilies?: readonly StoreBusinessFamily[];
  templateIds?: readonly string[];
}

export interface StorefrontVariantEditorMetadata {
  group: "layout" | "content" | "commerce" | "media" | "specialized";
  order: number;
  preview: "schematic" | "thumbnail" | "live";
  badge?: "recommended" | "advanced" | "media";
}

export interface StorefrontVariantDefinition {
  id: string;
  blockType: StorePageBlock["type"];
  label: string;
  description: string;
  guidance: string;
  rendererKey?: string;
  compatibleBusinessFamilies: readonly StoreBusinessFamily[];
  requiredCapabilities: readonly string[];
  recommendedFor?: StorefrontVariantRecommendation;
  requirements: StorefrontVariantRequirements;
  responsive: StorefrontResponsiveContract;
  safeFallback: string;
  performanceClass: StorefrontPerformanceClass;
  interactionRequirement: StorefrontInteractionRequirement;
  editor: StorefrontVariantEditorMetadata;
  version: 1;
}
