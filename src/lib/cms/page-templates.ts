import type { StorePage, StorePageBlock } from "@/lib/cms/schema";
import { createDefaultBlock } from "@/lib/cms/block-library";

export interface CmsPageTemplate {
  id: string;
  name: string;
  description: string;
  page: Omit<StorePage, "id">;
}

function createTemplateBlock<TType extends StorePageBlock["type"]>(
  type: TType,
  sortOrder: number,
  props: Extract<StorePageBlock, { type: TType }>["props"],
): Extract<StorePageBlock, { type: TType }> {
  return {
    ...createDefaultBlock(type, sortOrder),
    props,
  } as Extract<StorePageBlock, { type: TType }>;
}

function cloneBlock(block: StorePageBlock, sortOrder: number): StorePageBlock {
  return {
    ...block,
    id: crypto.randomUUID(),
    sortOrder,
  };
}

export const cmsPageTemplates: CmsPageTemplate[] = [
  {
    id: "landing",
    name: "Landing",
    description: "Hero, promo, categories, and featured products for campaign pages.",
    page: {
      slug: "/landing",
      title: "Landing Page",
      seoTitle: "Landing Page",
      seoDescription: "A campaign-focused landing page for product launches and promotions.",
      isHomepage: false,
      blocks: [
        createTemplateBlock("hero", 0, {
          tagline: "New Collection",
          title: "Launch Your Next",
          highlight: "Drop",
          subtitle: "Use this landing template for new product lines, campaign pages, or seasonal offers.",
          ctaText: "Browse the collection",
          ctaLink: "/shop",
          secondaryCtaText: "See the story",
          secondaryCtaLink: "/about",
        }),
        createTemplateBlock("promo-banner", 1, {
          title: "A strong offer in the middle of the page",
          subtitle: "Pair this with your main campaign message and one decisive CTA.",
          ctaText: "Shop the offer",
          ctaLink: "/shop?sale=1",
          badgeText: "Featured Campaign",
          bgStyle: "gradient",
          textAlignment: "center",
        }),
        createDefaultBlock("category-showcase", 2),
        createTemplateBlock("featured-products", 3, {
          limit: 6,
          title: "Featured Picks",
          tagline: "Curated",
        }),
      ],
    },
  },
  {
    id: "about",
    name: "About",
    description: "Story-driven page with brand intro, mission, and trust-building sections.",
    page: {
      slug: "/about-brand",
      title: "About Brand",
      seoTitle: "About Our Brand",
      seoDescription: "Share your story, values, and what makes the brand worth following.",
      isHomepage: false,
      blocks: [
        createTemplateBlock("rich-text", 0, {
          eyebrow: "Our Story",
          title: "Tell customers where the brand comes from",
          body: "Use this page to explain your origin, the people behind the store, and why your products matter.",
          align: "left",
        }),
        createTemplateBlock("rich-text", 1, {
          eyebrow: "Craft",
          title: "What you care about in product quality",
          body: "Explain fabrics, fit, sourcing, finishing, or anything that helps customers trust the product.",
          align: "left",
        }),
        createTemplateBlock("featured-products", 2, {
          limit: 3,
          title: "Start Here",
          tagline: "Recommended",
        }),
      ],
    },
  },
  {
    id: "policy",
    name: "Policy",
    description: "Refund, delivery, and service information in a simple content-first layout.",
    page: {
      slug: "/policy",
      title: "Policy",
      seoTitle: "Store Policy",
      seoDescription: "Refunds, shipping, exchange policy, and customer support notes.",
      isHomepage: false,
      blocks: [
        createTemplateBlock("rich-text", 0, {
          eyebrow: "Store Policy",
          title: "Set clear expectations before purchase",
          body: "Summarize delivery times, return windows, payment terms, exchange rules, and support availability.",
          align: "left",
        }),
        createTemplateBlock("rich-text", 1, {
          eyebrow: "Need help?",
          title: "Make support easy to find",
          body: "Add WhatsApp response hours, phone support, or order-issue escalation details here.",
          align: "left",
        }),
      ],
    },
  },
];

export function instantiateTemplate(templateId: string, pageCount: number): StorePage | null {
  const template = cmsPageTemplates.find((item) => item.id === templateId);
  if (!template) {
    return null;
  }

  const source = template.page;
  const safeSlug = source.slug === "/" ? `/page-${pageCount + 1}` : source.slug;

  return {
    ...source,
    id: crypto.randomUUID(),
    slug: safeSlug,
    blocks: source.blocks.map((block, index) => cloneBlock(block, index)),
  };
}

export function applyTemplateToPage(page: StorePage, templateId: string): StorePage | null {
  const template = cmsPageTemplates.find((item) => item.id === templateId);
  if (!template) {
    return null;
  }

  return {
    ...page,
    title: template.page.title,
    seoTitle: template.page.seoTitle,
    seoDescription: template.page.seoDescription,
    blocks: template.page.blocks.map((block, index) => cloneBlock(block, index)),
  };
}
