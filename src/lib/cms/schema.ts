import { z } from "zod";
import { parseLegacyStringToDoc } from "./rich-text-adapter";

export const storeThemeSchema = z.object({
  presetId: z.string().default("default"),
  themePackageId: z.string().optional(),
  mode: z.enum(["light", "dark"]).default("dark"),
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
  borderRadius: z.string().optional(),
  radiusScale: z.number().min(0).max(1).optional(),
  densityScale: z.number().min(0).max(1).optional(),
  aesthetic: z.enum(["minimal", "glassmorphism", "fluid", "brutalist", "neumorphism", "editorial", "retro", "artisan", "dark-luxury", "playful-pop"]).optional(),
  effects: z.object({
    scrollReveals: z.boolean().default(false),
    hoverEffects: z.boolean().default(true),
    parallax: z.boolean().default(false),
    intensity: z.enum(["subtle", "medium", "bold"]).default("medium"),
  }).optional(),
  paletteSource: z.enum(["manual", "generated"]).optional(),
  paletteSeed: z.string().optional(),
  customCssVars: z.record(z.string(), z.string()).default({}),
  customCss: z.string().optional(),
  globalHeadInjection: z.string().optional(),
  globalBodyInjection: z.string().optional(),
  schemaVersion: z.number().optional(),
});

const baseBlockFields = {
  id: z.string(),
  isVisible: z.boolean().default(true),
  visible: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
  entranceAnimation: z.enum(["none", "fade", "slide-up", "zoom", "stagger"]).optional(),
  hoverEffect: z.enum(["none", "lift", "zoom", "glow"]).optional(),
  effectOverride: z.boolean().optional(),
  layoutVariant: z.string().optional(),
  customHtml: z.string().optional(),
  customCss: z.string().optional(),
};

const focalCoordinateSchema = z.union([z.number(), z.string()]).optional();
const imagePositionSchema = z.enum([
  "center",
  "top",
  "bottom",
  "left",
  "right",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
]).optional();

const countdownBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("countdown"),
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    endDate: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    bgGradient: z.string().optional(),
  }).default({}),
});

const heroBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("hero"),
  props: z.object({
    anchorId: z.string().optional(),
    tagline: z.string().optional(),
    title: z.string().optional(),
    highlight: z.string().optional(),
    subtitle: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    secondaryCtaText: z.string().optional(),
    secondaryCtaLink: z.string().optional(),
    mediaUrl: z.string().optional(),
    mediaType: z.enum(["image", "video"]).optional(),
    mediaFit: z.enum(["cover", "contain"]).optional(),
    imagePosition: imagePositionSchema,
    focalX: focalCoordinateSchema,
    focalY: focalCoordinateSchema,
    overlayColor: z.string().optional(),
    overlayOpacity: z.number().int().min(0).max(100).optional(),
  }).default({}),
});

const promoBannerBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("promo-banner"),
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    badgeText: z.string().optional(),
    bgStyle: z.enum(["gradient", "dark", "accent", "luxury-gold", "indigo", "rose", "aurora", "luxury-dark", "confetti", "mesh-gradient"]).optional(),
    textAlignment: z.enum(["left", "center", "right"]).optional(),
    paddingSize: z.enum(["compact", "cozy", "large"]).optional(),
    enableGlow: z.boolean().optional(),
    enableParticles: z.boolean().optional(),
    enableOrbs: z.boolean().optional(),
    cardOpacity: z.number().int().min(0).max(100).optional(),
  }).default({}),
});

const categoryShowcaseBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("category-showcase"),
  props: z.object({
    tagline: z.string().optional(),
    title: z.string().optional(),
    source: z.enum(["auto", "categories", "types"]).optional(),
    limit: z.number().int().positive().max(24).optional(),
    items: z.array(z.object({
      label: z.string().min(1),
      value: z.string().min(1),
      tagline: z.string().optional(),
      imageUrl: z.string().optional(),
      filterKey: z.enum(["category", "type"]).optional(),
    })).max(24).optional(),
    imagePosition: imagePositionSchema,
    focalX: focalCoordinateSchema,
    focalY: focalCoordinateSchema,
  }).default({}),
});

const featuredProductsBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("featured-products"),
  props: z.object({
    limit: z.number().int().positive().max(24).default(6),
    title: z.string().optional(),
    tagline: z.string().optional(),
    source: z.enum(["featured-or-all", "featured", "all", "newest", "category", "type"]).optional(),
    category: z.string().optional(),
    productType: z.string().optional(),
    imagePosition: imagePositionSchema,
    focalX: focalCoordinateSchema,
    focalY: focalCoordinateSchema,
  }).default({}),
});

const comparisonBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("comparison"),
  props: z.object({
    title: z.string().optional(),
    tagline: z.string().optional(),
    source: z.enum(["featured-or-all", "featured", "all", "newest", "category", "type"]).optional(),
    category: z.string().optional(),
    productType: z.string().optional(),
    limit: z.number().int().positive().max(4).default(2),
    specLabels: z.array(z.string().min(1)).max(6).default([]),
    ctaText: z.string().optional(),
  }).default({}),
});

const recommendedProductsBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("recommended-products"),
  props: z.object({
    limit: z.number().int().positive().max(24).default(4),
    title: z.string().optional(),
    tagline: z.string().optional(),
    source: z.enum(["featured-or-all", "featured", "all", "newest", "category", "type"]).optional(),
    category: z.string().optional(),
    productType: z.string().optional(),
    imagePosition: imagePositionSchema,
    focalX: focalCoordinateSchema,
    focalY: focalCoordinateSchema,
  }).default({}),
});

const recentlyViewedBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("recently-viewed"),
  props: z.object({
    title: z.string().optional(),
  }).default({}),
});

export const richTextNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.string(),
    text: z.string().optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z
      .array(
        z.object({
          type: z.string(),
          attrs: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .optional(),
    content: z.array(richTextNodeSchema).optional(),
  }),
);

export const richTextDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(richTextNodeSchema).default([]),
});

export type RichTextNode = z.infer<typeof richTextNodeSchema>;
export type RichTextDoc = z.infer<typeof richTextDocSchema>;

const richTextBodySchema = z.union([
  richTextDocSchema,
  z.string(),
]);

const richTextBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("rich-text"),
  props: z.object({
    eyebrow: z.string().optional(),
    title: z.string().min(1),
    body: richTextBodySchema,
    align: z.enum(["left", "center"]).default("center"),
    imageUrl: z.string().optional(),
    imageAlt: z.string().optional(),
    imagePosition: imagePositionSchema,
    focalX: focalCoordinateSchema,
    focalY: focalCoordinateSchema,
  }),
});

const socialFeedBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("social-feed"),
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    images: z.array(z.string()).default([]),
  }).default({}),
});

const videoReelBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("video-reel"),
  props: z.object({
    videoUrl: z.string().optional(),
    title: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
  }).default({}),
});

const faqAccordionBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("faq-accordion"),
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    faqs: z.array(z.object({
      q: z.string(),
      a: z.string(),
    })).default([]),
  }).default({}),
});

const trustBadgesBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("trust-badges"),
  props: z.object({
    title: z.string().optional(),
    badges: z.array(z.object({
      label: z.string(),
      description: z.string().optional(),
      icon: z.enum(["truck", "payment", "returns", "support", "shield"]).optional(),
    })).default([]),
  }).default({}),
});

const testimonialsBlockSchema = z.object({
  ...baseBlockFields,
  type: z.literal("testimonials"),
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    source: z.enum(["manual", "live"]).optional(),
    limit: z.number().int().positive().max(12).optional(),
    reviews: z.array(z.object({
      name: z.string(),
      rating: z.number().int().min(1).max(5).default(5),
      comment: z.string(),
    })).default([]),
  }).default({}),
});

export const storePageBlockSchema = z.discriminatedUnion("type", [
  countdownBlockSchema,
  heroBlockSchema,
  promoBannerBlockSchema,
  categoryShowcaseBlockSchema,
  featuredProductsBlockSchema,
  comparisonBlockSchema,
  recommendedProductsBlockSchema,
  recentlyViewedBlockSchema,
  richTextBlockSchema,
  socialFeedBlockSchema,
  videoReelBlockSchema,
  faqAccordionBlockSchema,
  trustBadgesBlockSchema,
  testimonialsBlockSchema,
]);

export const storePageSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  title: z.string().min(1),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  isHomepage: z.boolean().default(false),
  blocks: z.array(storePageBlockSchema).min(1),
});

export const storePageRevisionSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  label: z.string().min(1),
  createdAt: z.string(),
  blocksSnapshot: z.array(storePageBlockSchema),
});

export const storeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  logoUrl: z.string().optional(),
  customDomain: z.string().optional(),
  description: z.string().min(1),
  currencyCode: z.string().default("BDT"),
  locale: z.string().default("en-BD"),
  isPublished: z.boolean().default(false),
  theme: storeThemeSchema,
  pages: z.array(storePageSchema).min(1),
  siteSettings: z.record(z.string(), z.unknown()).optional(),
});

export type StoreTheme = z.infer<typeof storeThemeSchema>;
export type StorePageBlock = z.infer<typeof storePageBlockSchema>;
export type StorePage = z.infer<typeof storePageSchema>;
export type StorePageRevision = z.infer<typeof storePageRevisionSchema>;
export type Store = z.infer<typeof storeSchema>;
