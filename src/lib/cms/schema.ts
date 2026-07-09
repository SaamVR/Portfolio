import { z } from "zod";

export const storeThemeSchema = z.object({
  presetId: z.string().default("default"),
  mode: z.enum(["light", "dark"]).default("dark"),
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
  borderRadius: z.string().optional(),
  customCssVars: z.record(z.string(), z.string()).default({}),
});

const countdownBlockSchema = z.object({
  id: z.string(),
  type: z.literal("countdown"),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
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
  id: z.string(),
  type: z.literal("hero"),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
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
    overlayColor: z.string().optional(),
    overlayOpacity: z.number().int().min(0).max(100).optional(),
  }).default({}),
});

const promoBannerBlockSchema = z.object({
  id: z.string(),
  type: z.literal("promo-banner"),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
    badgeText: z.string().optional(),
    bgStyle: z.enum(["gradient", "dark", "accent", "luxury-gold", "indigo", "rose"]).optional(),
    textAlignment: z.enum(["left", "center", "right"]).optional(),
    paddingSize: z.enum(["compact", "cozy", "large"]).optional(),
    enableGlow: z.boolean().optional(),
    enableParticles: z.boolean().optional(),
    enableOrbs: z.boolean().optional(),
    cardOpacity: z.number().int().min(0).max(100).optional(),
  }).default({}),
});

const categoryShowcaseBlockSchema = z.object({
  id: z.string(),
  type: z.literal("category-showcase"),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
  props: z.object({
    tagline: z.string().optional(),
    title: z.string().optional(),
  }).default({}),
});

const featuredProductsBlockSchema = z.object({
  id: z.string(),
  type: z.literal("featured-products"),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
  props: z.object({
    limit: z.number().int().positive().max(24).default(6),
    title: z.string().optional(),
    tagline: z.string().optional(),
  }).default({}),
});

const recentlyViewedBlockSchema = z.object({
  id: z.string(),
  type: z.literal("recently-viewed"),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
  props: z.object({
    title: z.string().optional(),
  }).default({}),
});

const richTextBlockSchema = z.object({
  id: z.string(),
  type: z.literal("rich-text"),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
  props: z.object({
    eyebrow: z.string().optional(),
    title: z.string().min(1),
    body: z.string().min(1),
    align: z.enum(["left", "center"]).default("center"),
  }),
});

const socialFeedBlockSchema = z.object({
  id: z.string(),
  type: z.literal("social-feed"),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    images: z.array(z.string()).default([]),
  }).default({}),
});

const videoReelBlockSchema = z.object({
  id: z.string(),
  type: z.literal("video-reel"),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
  props: z.object({
    videoUrl: z.string().optional(),
    title: z.string().optional(),
    ctaText: z.string().optional(),
    ctaLink: z.string().optional(),
  }).default({}),
});

const faqAccordionBlockSchema = z.object({
  id: z.string(),
  type: z.literal("faq-accordion"),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative(),
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    faqs: z.array(z.object({
      q: z.string(),
      a: z.string(),
    })).default([]),
  }).default({}),
});

export const storePageBlockSchema = z.discriminatedUnion("type", [
  countdownBlockSchema,
  heroBlockSchema,
  promoBannerBlockSchema,
  categoryShowcaseBlockSchema,
  featuredProductsBlockSchema,
  recentlyViewedBlockSchema,
  richTextBlockSchema,
  socialFeedBlockSchema,
  videoReelBlockSchema,
  faqAccordionBlockSchema,
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
  description: z.string().min(1),
  currencyCode: z.string().default("BDT"),
  locale: z.string().default("en-BD"),
  isPublished: z.boolean().default(false),
  theme: storeThemeSchema,
  pages: z.array(storePageSchema).min(1),
});

export type StoreTheme = z.infer<typeof storeThemeSchema>;
export type StorePageBlock = z.infer<typeof storePageBlockSchema>;
export type StorePage = z.infer<typeof storePageSchema>;
export type StorePageRevision = z.infer<typeof storePageRevisionSchema>;
export type Store = z.infer<typeof storeSchema>;
