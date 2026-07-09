import { createDefaultBlock } from "@/lib/cms/block-library";
import { slugify } from "@/lib/slug";
import type { StorePage, StorePageBlock, StoreTheme } from "@/lib/cms/schema";

export type LaunchTemplateId = "clothing" | "food" | "general";

export interface LaunchTemplatePaymentDefaults {
  bkash_enabled: boolean;
  nagad_enabled: boolean;
  cod_enabled: boolean;
  prepaid_badge_text: string;
  prepayment_discount_type: "none" | "free_delivery" | "percentage" | "fixed";
  prepayment_discount_value: number;
}

export interface LaunchTemplate {
  id: LaunchTemplateId;
  name: string;
  shortName: string;
  description: string;
  storeDescription: string;
  theme: StoreTheme;
  hero: {
    tagline: string;
    title: string;
    highlight: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
    mediaUrl?: string;
  };
  pages: Omit<StorePage, "id">[];
  paymentDefaults: LaunchTemplatePaymentDefaults;
}

function block<TType extends StorePageBlock["type"]>(
  type: TType,
  sortOrder: number,
  props: Extract<StorePageBlock, { type: TType }>["props"],
): Extract<StorePageBlock, { type: TType }> {
  return {
    ...createDefaultBlock(type, sortOrder),
    props,
  } as Extract<StorePageBlock, { type: TType }>;
}

export const launchTemplates: LaunchTemplate[] = [
  {
    id: "clothing",
    name: "Clothing Store",
    shortName: "Clothing",
    description: "A fashion-first storefront for drops, categories, and featured products.",
    storeDescription: "Premium clothing, curated drops, and everyday essentials with fast local delivery.",
    theme: {
      presetId: "default",
      mode: "dark",
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    hero: {
      tagline: "New Season",
      title: "Wear Your",
      highlight: "Identity",
      subtitle: "Launch your clothing store with curated drops, premium product sections, and mobile-first checkout.",
      ctaText: "Shop Now",
      ctaLink: "/shop",
      secondaryCtaText: "Explore Collections",
      secondaryCtaLink: "/shop",
    },
    pages: [
      {
        slug: "/",
        title: "Home",
        seoTitle: "Clothing Store",
        seoDescription: "Shop curated clothing drops and everyday essentials.",
        isHomepage: true,
        blocks: [
          block("hero", 0, {
            tagline: "New Season",
            title: "Wear Your",
            highlight: "Identity",
            subtitle: "Curated clothing drops, everyday essentials, and fast checkout for your customers.",
            ctaText: "Shop Now",
            ctaLink: "/shop",
            secondaryCtaText: "View Collection",
            secondaryCtaLink: "/shop",
          }),
          block("promo-banner", 1, {
            title: "Launch Drop Is Live",
            subtitle: "Show your newest shirts, polos, sets, or accessories with a strong campaign banner.",
            ctaText: "Browse New Arrivals",
            ctaLink: "/shop",
            badgeText: "Fresh Drop",
            bgStyle: "gradient",
            textAlignment: "center",
          }),
          block("category-showcase", 2, {
            tagline: "Categories",
            title: "Shop by Style",
          }),
          block("featured-products", 3, {
            limit: 6,
            title: "Featured Fits",
            tagline: "Curated",
          }),
          block("rich-text", 4, {
            eyebrow: "Why Shop Here",
            title: "Built for fast drops and loyal customers",
            body: "Use this section for fit notes, fabric quality, exchange policy, or your brand story.",
            align: "center",
          }),
        ],
      },
      {
        slug: "/policy",
        title: "Policy",
        seoTitle: "Return and Delivery Policy",
        seoDescription: "Delivery, exchange, and return policy.",
        isHomepage: false,
        blocks: [
          block("rich-text", 0, {
            eyebrow: "Store Policy",
            title: "Clear delivery and exchange rules",
            body: "Add delivery timelines, exchange windows, size-change rules, and support hours here.",
            align: "left",
          }),
        ],
      },
    ],
    paymentDefaults: {
      bkash_enabled: true,
      nagad_enabled: true,
      cod_enabled: true,
      prepaid_badge_text: "Priority Delivery",
      prepayment_discount_type: "none",
      prepayment_discount_value: 0,
    },
  },
  {
    id: "food",
    name: "Food Store",
    shortName: "Food",
    description: "A menu-style store for homemade food, bakery items, meal boxes, and local delivery.",
    storeDescription: "Fresh food, meal boxes, bakery items, and local delivery made simple.",
    theme: {
      presetId: "warm-earth",
      mode: "light",
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",
      borderRadius: "1rem",
      customCssVars: {},
    },
    hero: {
      tagline: "Fresh Today",
      title: "Homemade",
      highlight: "Goodness",
      subtitle: "Sell meals, bakery items, and daily specials with a simple storefront built for local orders.",
      ctaText: "Order Now",
      ctaLink: "/shop",
      secondaryCtaText: "See Specials",
      secondaryCtaLink: "/shop?sale=1",
    },
    pages: [
      {
        slug: "/",
        title: "Home",
        seoTitle: "Fresh Food Delivery",
        seoDescription: "Order fresh meals, bakery items, and local food specials.",
        isHomepage: true,
        blocks: [
          block("hero", 0, {
            tagline: "Fresh Today",
            title: "Homemade",
            highlight: "Goodness",
            subtitle: "Daily meals, bakery items, and local delivery from your kitchen to their table.",
            ctaText: "Order Now",
            ctaLink: "/shop",
            secondaryCtaText: "Today's Specials",
            secondaryCtaLink: "/shop?sale=1",
          }),
          block("promo-banner", 1, {
            title: "Today's Special Menu",
            subtitle: "Feature combo meals, pre-order items, or limited daily batches before they sell out.",
            ctaText: "View Menu",
            ctaLink: "/shop",
            badgeText: "Fresh Batch",
            bgStyle: "luxury-gold",
            textAlignment: "center",
          }),
          block("featured-products", 2, {
            limit: 6,
            title: "Popular Items",
            tagline: "Best Sellers",
          }),
          block("rich-text", 3, {
            eyebrow: "Delivery Notes",
            title: "Set expectations before customers order",
            body: "Add delivery zones, pre-order deadlines, freshness notes, and support contact details.",
            align: "center",
          }),
        ],
      },
      {
        slug: "/about-kitchen",
        title: "About Kitchen",
        seoTitle: "About Our Kitchen",
        seoDescription: "Learn about our kitchen, food quality, and delivery process.",
        isHomepage: false,
        blocks: [
          block("rich-text", 0, {
            eyebrow: "Our Kitchen",
            title: "Tell customers what makes your food trusted",
            body: "Share your cooking story, hygiene promise, ingredients, delivery process, or batch timings.",
            align: "left",
          }),
        ],
      },
    ],
    paymentDefaults: {
      bkash_enabled: true,
      nagad_enabled: true,
      cod_enabled: true,
      prepaid_badge_text: "Confirmed Pre-Order",
      prepayment_discount_type: "none",
      prepayment_discount_value: 0,
    },
  },
  {
    id: "general",
    name: "General Store",
    shortName: "General",
    description: "A flexible storefront for accessories, gifts, home goods, and mixed catalog sellers.",
    storeDescription: "A simple online store for curated products, gifts, essentials, and local delivery.",
    theme: {
      presetId: "ocean-teal",
      mode: "light",
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'Plus Jakarta Sans', sans-serif",
      borderRadius: "0.75rem",
      customCssVars: {},
    },
    hero: {
      tagline: "Curated Picks",
      title: "Everything",
      highlight: "You Love",
      subtitle: "Start with a flexible storefront for products, offers, and clear customer support.",
      ctaText: "Browse Store",
      ctaLink: "/shop",
      secondaryCtaText: "Contact Us",
      secondaryCtaLink: "/contact",
    },
    pages: [
      {
        slug: "/",
        title: "Home",
        seoTitle: "Online Store",
        seoDescription: "Browse curated products and local offers.",
        isHomepage: true,
        blocks: [
          block("hero", 0, {
            tagline: "Curated Picks",
            title: "Everything",
            highlight: "You Love",
            subtitle: "A flexible storefront for products, gift items, essentials, and local offers.",
            ctaText: "Browse Store",
            ctaLink: "/shop",
            secondaryCtaText: "Get Support",
            secondaryCtaLink: "/contact",
          }),
          block("promo-banner", 1, {
            title: "Featured Offers",
            subtitle: "Highlight new stock, bundles, seasonal campaigns, or special delivery offers.",
            ctaText: "Shop Offers",
            ctaLink: "/shop?sale=1",
            badgeText: "Limited Offer",
            bgStyle: "indigo",
            textAlignment: "center",
          }),
          block("category-showcase", 2, {
            tagline: "Browse",
            title: "Shop by Category",
          }),
          block("featured-products", 3, {
            limit: 6,
            title: "Featured Products",
            tagline: "Recommended",
          }),
        ],
      },
      {
        slug: "/about-store",
        title: "About Store",
        seoTitle: "About Our Store",
        seoDescription: "Learn about our products and service.",
        isHomepage: false,
        blocks: [
          block("rich-text", 0, {
            eyebrow: "About",
            title: "Introduce your store clearly",
            body: "Tell customers what you sell, how delivery works, and why they can trust you.",
            align: "left",
          }),
        ],
      },
    ],
    paymentDefaults: {
      bkash_enabled: true,
      nagad_enabled: false,
      cod_enabled: true,
      prepaid_badge_text: "Fast Processing",
      prepayment_discount_type: "none",
      prepayment_discount_value: 0,
    },
  },
];

export function getLaunchTemplate(templateId: LaunchTemplateId): LaunchTemplate {
  return launchTemplates.find((template) => template.id === templateId) ?? launchTemplates[0];
}

export function createStoreSlug(name: string) {
  return slugify(name || "my-store") || "my-store";
}

export function instantiateLaunchPages(templateId: LaunchTemplateId): StorePage[] {
  const template = getLaunchTemplate(templateId);

  return template.pages.map((page) => ({
    ...page,
    id: crypto.randomUUID(),
    blocks: page.blocks.map((pageBlock, index) => ({
      ...pageBlock,
      id: crypto.randomUUID(),
      sortOrder: index,
    })),
  }));
}
