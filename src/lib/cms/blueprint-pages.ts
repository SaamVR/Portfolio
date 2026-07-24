import { createDefaultBlock } from "@/lib/cms/block-library";
import { fallbackPageBlueprints, instantiatePageBlueprint, type CmsPageBlueprint } from "@/lib/cms/page-blueprints";
import { getStoreBlueprintById, type StoreBlueprintDefinition } from "@/lib/cms/store-blueprints";
import type { StorePage, StorePageBlock } from "@/lib/cms/schema";

const pageBlueprintAliasMap: Record<string, string> = {
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
    "recently-viewed",
    "rich-text",
    "social-feed",
    "video-reel",
    "faq-accordion",
    "trust-badges",
    "testimonials",
  ].includes(value);
}

function buildHomepageFromBlueprint(blueprint: StoreBlueprintDefinition): StorePage {
  const homepageBlocks = blueprint.recommendedBlockSet
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
          tagline: blueprint.hero.tagline,
          title: blueprint.hero.title,
          highlight: blueprint.hero.highlight,
          subtitle: blueprint.hero.subtitle,
        },
      } satisfies StorePageBlock;
    });

  return {
    id: crypto.randomUUID(),
    slug: "/",
    title: "Home",
    seoTitle: `${blueprint.name} Home`,
    seoDescription: blueprint.storeDescription,
    isHomepage: true,
    blocks: homepageBlocks.length > 0 ? homepageBlocks : [createDefaultBlock("rich-text", 0)],
  };
}

function shouldIncludeShopPage(blueprint: StoreBlueprintDefinition) {
  return blueprint.businessFamily === "commerce"
    && blueprint.catalogMode !== "single_product"
    && shopEligibleCatalogModes.has(blueprint.catalogMode);
}

function buildShopPageFromBlueprint(blueprint: StoreBlueprintDefinition): StorePage {
  const helperBlock = createDefaultBlock("rich-text", 0) as Extract<StorePageBlock, { type: "rich-text" }>;

  return {
    id: crypto.randomUUID(),
    slug: "/shop",
    title: blueprint.catalogMode === "menu" ? "Menu" : "Shop",
    seoTitle: blueprint.catalogMode === "menu" ? `Menu | ${blueprint.name}` : `Shop | ${blueprint.name}`,
    seoDescription: blueprint.catalogMode === "menu"
      ? "Browse available menu items and current offers."
      : "Browse products, collections, and current offers.",
    isHomepage: false,
    blocks: [
      {
        ...helperBlock,
        isVisible: false,
        props: {
          ...helperBlock.props,
          eyebrow: blueprint.catalogMode === "menu" ? "Menu" : "Shop",
          title: blueprint.catalogMode === "menu" ? "Browse the menu" : "Browse the catalog",
          body: "This storefront uses the dedicated shop route for product browsing. Keep this page in the template graph so navigation and Basic Mode understand the shopping flow.",
          align: "left",
        },
      },
    ],
  };
}

export function ensureRequiredStoreFlowPages(
  pages: StorePage[],
  blueprint: StoreBlueprintDefinition,
): StorePage[] {
  if (!shouldIncludeShopPage(blueprint) || pages.some((page) => page.slug === "/shop")) {
    return pages;
  }

  return [...pages, buildShopPageFromBlueprint(blueprint)];
}

function mapRecommendedPageToBlueprintId(
  pageId: string,
  pageBlueprints: CmsPageBlueprint[],
): string | null {
  if (pageId in pageBlueprintAliasMap) {
    return pageBlueprintAliasMap[pageId] || null;
  }

  return pageBlueprints.some((blueprint) => blueprint.id === pageId) ? pageId : null;
}

export function instantiateStorePagesFromBlueprint(
  blueprintInput: string | StoreBlueprintDefinition,
  pageBlueprints: CmsPageBlueprint[] = fallbackPageBlueprints,
): StorePage[] {
  const blueprint = typeof blueprintInput === "string"
    ? getStoreBlueprintById(blueprintInput)
    : blueprintInput;

  const pages: StorePage[] = [buildHomepageFromBlueprint(blueprint)];
  const recommendedPages = Array.from(new Set(blueprint.recommendedPageSet));

  for (const pageId of recommendedPages) {
    const mappedBlueprintId = mapRecommendedPageToBlueprintId(pageId, pageBlueprints);
    if (!mappedBlueprintId) {
      continue;
    }

    const page = instantiatePageBlueprint(mappedBlueprintId, pages.length, pageBlueprints);
    if (page) {
      pages.push(page);
    }
  }

  return ensureRequiredStoreFlowPages(pages, blueprint);
}
