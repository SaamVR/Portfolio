import { createDefaultBlock } from "@/lib/cms/block-library";
import { instantiateTemplate } from "@/lib/cms/page-templates";
import {
  getStorefrontTemplateSeedDefinition,
  resolveStorefrontTemplateProfile,
  type ResolvedStorefrontTemplateProfile,
  type StorefrontTemplateSeedDefinition,
} from "@/lib/cms/storefront-templates";
import type { StorePage, StorePageBlock } from "@/lib/cms/schema";

type TemplatePageSeedDefinition = Pick<
  StorefrontTemplateSeedDefinition,
  "id" | "name" | "storeDescription" | "businessFamily" | "catalogMode" | "recommendedPageSet" | "defaultBlockSet" | "recommendedBlockSet" | "hero"
>;

const pageTemplateAliasMap: Record<string, string> = {
  about: "about",
  "about-kitchen": "about",
  contact: "contact-us",
  home: "",
  policy: "policy",
};

const shopEligibleCatalogModes = new Set([
  "multi_product",
  "menu",
  "digital_download",
  "multi_vendor",
  "pre_order",
  "inquiry_only",
]);

function isStorePageBlockType(value: string): value is StorePageBlock["type"] {
  return [
    "hero",
    "countdown",
    "promo-banner",
    "category-showcase",
    "featured-products",
    "comparison",
    "recommended-products",
    "recently-viewed",
    "rich-text",
    "social-feed",
    "video-reel",
    "faq-accordion",
    "trust-badges",
    "testimonials",
  ].includes(value);
}

function buildHomepageFromTemplateSeed(seed: TemplatePageSeedDefinition): StorePage {
  const homepageBlocks = seed.defaultBlockSet
    .filter(isStorePageBlockType)
    .map((blockType, index) => {
      const baseBlock = createDefaultBlock(blockType, index);

      if (baseBlock.type !== "hero") {
        return baseBlock;
      }

      return {
        ...baseBlock,
        props: {
          ...baseBlock.props,
          tagline: seed.hero.tagline,
          title: seed.hero.title,
          highlight: seed.hero.highlight,
          subtitle: seed.hero.subtitle,
        },
      } satisfies StorePageBlock;
    });

  return {
    id: crypto.randomUUID(),
    slug: "/",
    title: "Home",
    seoTitle: `${seed.name} Home`,
    seoDescription: seed.storeDescription,
    isHomepage: true,
    blocks: homepageBlocks.length > 0 ? homepageBlocks : [createDefaultBlock("hero", 0)],
  };
}

function shouldIncludeShopPage(seed: TemplatePageSeedDefinition) {
  return seed.businessFamily === "commerce"
    && seed.catalogMode !== "single_product"
    && shopEligibleCatalogModes.has(seed.catalogMode);
}

function buildShopPageFromTemplateSeed(seed: TemplatePageSeedDefinition): StorePage {
  const helperBlock = createDefaultBlock("rich-text", 0) as Extract<StorePageBlock, { type: "rich-text" }>;

  return {
    id: crypto.randomUUID(),
    slug: "/shop",
    title: seed.catalogMode === "menu" ? "Menu" : "Shop",
    seoTitle: seed.catalogMode === "menu" ? `Menu | ${seed.name}` : `Shop | ${seed.name}`,
    seoDescription: seed.catalogMode === "menu"
      ? "Browse available menu items and current offers."
      : "Browse products, collections, and current offers.",
    isHomepage: false,
    blocks: [
      {
        ...helperBlock,
        isVisible: false,
        props: {
          ...helperBlock.props,
          eyebrow: seed.catalogMode === "menu" ? "Menu" : "Shop",
          title: seed.catalogMode === "menu" ? "Browse the menu" : "Browse the catalog",
          body: "This storefront uses the dedicated shop route for product browsing. Keep this page in the template graph so navigation and editor flows understand the shopping path.",
          align: "left",
        },
      },
    ],
  };
}

function mapRecommendedPageTemplateId(pageId: string): string | null {
  if (pageId in pageTemplateAliasMap) {
    return pageTemplateAliasMap[pageId] || null;
  }

  return pageId;
}

function toTemplateSeedDefinition(
  input: string | TemplatePageSeedDefinition | ResolvedStorefrontTemplateProfile,
  options?: {
    templateSeedId?: string | null;
    productVisibility?: string | null;
  },
): TemplatePageSeedDefinition {
  if (typeof input === "object" && input && "seedDefinition" in input) {
    return input.seedDefinition;
  }

  if (typeof input === "object" && input && "recommendedPageSet" in input) {
    return input;
  }

  const profile = resolveStorefrontTemplateProfile(input, options);
  return getStorefrontTemplateSeedDefinition(profile.templateId);
}

export function ensureRequiredStoreFlowPagesForTemplate(
  pages: StorePage[],
  input: string | TemplatePageSeedDefinition | ResolvedStorefrontTemplateProfile,
  options?: {
    templateSeedId?: string | null;
    productVisibility?: string | null;
  },
): StorePage[] {
  const seed = toTemplateSeedDefinition(input, options);
  if (!shouldIncludeShopPage(seed) || pages.some((page) => page.slug === "/shop")) {
    return pages;
  }

  return [...pages, buildShopPageFromTemplateSeed(seed)];
}

export function instantiateStorePagesFromTemplate(
  input: string | TemplatePageSeedDefinition | ResolvedStorefrontTemplateProfile,
  options?: {
    templateSeedId?: string | null;
    productVisibility?: string | null;
  },
): StorePage[] {
  const seed = toTemplateSeedDefinition(input, options);
  const pages: StorePage[] = [buildHomepageFromTemplateSeed(seed)];
  const recommendedPages = Array.from(new Set(seed.recommendedPageSet));

  for (const pageId of recommendedPages) {
    const mappedTemplateId = mapRecommendedPageTemplateId(pageId);
    if (!mappedTemplateId) {
      continue;
    }

    const page = instantiateTemplate(mappedTemplateId, pages.length);
    if (page) {
      pages.push(page);
    }
  }

  return ensureRequiredStoreFlowPagesForTemplate(pages, seed);
}
