import type { StorefrontBlockType, StorefrontTemplateId } from "@/lib/cms/storefront-templates";

export type StorefrontLayoutPresetId =
  | "fashion-editorial"
  | "fashion-culture-graphic"
  | "fashion-boutique"
  | "fashion-drop-streetwear";

export type StorefrontLayoutPresetSection = {
  /** Stable slot identity so a preset may contain the same block type more than once. */
  slotId: string;
  type: StorefrontBlockType;
  layoutVariant?: string;
  optional?: boolean;
  /**
   * Suggested defaults only. Preset application must never overwrite merchant-authored
   * content in an existing block unless the merchant explicitly asks to replace it.
   */
  props?: Readonly<Record<string, unknown>>;
};

export type StorefrontLayoutPreset = {
  id: StorefrontLayoutPresetId;
  templateId: StorefrontTemplateId;
  label: string;
  description: string;
  bestFor: string;
  contentPolicy: "preserve-merchant-content";
  extraBlockPolicy: "preserve-after-preset-flow";
  sections: readonly StorefrontLayoutPresetSection[];
};

const fashionPresets = [
  {
    id: "fashion-editorial",
    templateId: "fashion",
    label: "Editorial",
    description: "Photography-led fashion storytelling with slower browsing rhythm and generous whitespace.",
    bestFor: "Designer labels, boutiques, lookbooks, and campaign-led collections.",
    contentPolicy: "preserve-merchant-content",
    extraBlockPolicy: "preserve-after-preset-flow",
    sections: [
      { slotId: "hero", type: "hero", layoutVariant: "editorial" },
      { slotId: "collections", type: "category-showcase", layoutVariant: "masonry" },
      { slotId: "story", type: "rich-text", layoutVariant: "brand-story" },
      { slotId: "curated-products", type: "featured-products", layoutVariant: "2-col", props: { source: "featured-or-all" } },
      { slotId: "lookbook", type: "social-feed", layoutVariant: "gallery" },
      { slotId: "trust", type: "trust-badges", layoutVariant: "cards" },
      { slotId: "recently-viewed", type: "recently-viewed", optional: true },
      { slotId: "faq", type: "faq-accordion", optional: true },
    ],
  },
  {
    id: "fashion-culture-graphic",
    templateId: "fashion",
    label: "Culture / Graphic",
    description: "Bold collection-first merchandising with room for cultural identity, artwork, and campaign storytelling.",
    bestFor: "Graphic apparel, regional labels, artist collaborations, and culturally expressive brands.",
    contentPolicy: "preserve-merchant-content",
    extraBlockPolicy: "preserve-after-preset-flow",
    sections: [
      { slotId: "hero", type: "hero", layoutVariant: "poster" },
      { slotId: "collections", type: "category-showcase", layoutVariant: "masonry" },
      { slotId: "new-drop", type: "featured-products", layoutVariant: "3-col", props: { source: "newest" } },
      { slotId: "campaign", type: "promo-banner", layoutVariant: "standard" },
      { slotId: "story", type: "rich-text", layoutVariant: "brand-story" },
      { slotId: "community", type: "social-feed", layoutVariant: "gallery" },
      { slotId: "trust", type: "trust-badges", layoutVariant: "cards" },
      { slotId: "recently-viewed", type: "recently-viewed", optional: true },
      { slotId: "faq", type: "faq-accordion", optional: true },
    ],
  },
  {
    id: "fashion-boutique",
    templateId: "fashion",
    label: "Boutique",
    description: "Balanced fashion commerce with clear collection discovery, product merchandising, and brand proof.",
    bestFor: "Most apparel merchants that need equal emphasis on brand presentation and product discovery.",
    contentPolicy: "preserve-merchant-content",
    extraBlockPolicy: "preserve-after-preset-flow",
    sections: [
      { slotId: "hero", type: "hero", layoutVariant: "split" },
      { slotId: "collections", type: "category-showcase", layoutVariant: "cards" },
      { slotId: "featured-products", type: "featured-products", layoutVariant: "3-col", props: { source: "featured-or-all" } },
      { slotId: "promotion", type: "promo-banner", layoutVariant: "standard", optional: true },
      { slotId: "best-sellers", type: "recommended-products", layoutVariant: "3-col", optional: true },
      { slotId: "social", type: "social-feed", layoutVariant: "gallery", optional: true },
      { slotId: "trust", type: "trust-badges", layoutVariant: "cards" },
      { slotId: "recently-viewed", type: "recently-viewed", optional: true },
      { slotId: "faq", type: "faq-accordion", optional: true },
    ],
  },
  {
    id: "fashion-drop-streetwear",
    templateId: "fashion",
    label: "Drop / Streetwear",
    description: "Release-led storefront rhythm that moves shoppers quickly from campaign to the newest products.",
    bestFor: "Streetwear, limited drops, creator merchandise, and frequent launch cycles.",
    contentPolicy: "preserve-merchant-content",
    extraBlockPolicy: "preserve-after-preset-flow",
    sections: [
      { slotId: "hero", type: "hero", layoutVariant: "full-bleed" },
      { slotId: "countdown", type: "countdown", optional: true },
      { slotId: "new-drop", type: "featured-products", layoutVariant: "4-col", props: { source: "newest" } },
      { slotId: "collections", type: "category-showcase", layoutVariant: "carousel" },
      { slotId: "campaign-video", type: "video-reel", optional: true },
      { slotId: "social", type: "social-feed", layoutVariant: "gallery", optional: true },
      { slotId: "trust", type: "trust-badges", layoutVariant: "cards" },
      { slotId: "recently-viewed", type: "recently-viewed", optional: true },
      { slotId: "faq", type: "faq-accordion", optional: true },
    ],
  },
] as const satisfies readonly StorefrontLayoutPreset[];

const presetsByTemplate: Partial<Record<StorefrontTemplateId, readonly StorefrontLayoutPreset[]>> = {
  fashion: fashionPresets,
};

export function getStorefrontLayoutPresets(templateId: StorefrontTemplateId): readonly StorefrontLayoutPreset[] {
  return presetsByTemplate[templateId] ?? [];
}

export function getStorefrontLayoutPreset(id: StorefrontLayoutPresetId): StorefrontLayoutPreset | null {
  return fashionPresets.find((preset) => preset.id === id) ?? null;
}
