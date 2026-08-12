import type { StorePage, StorePageBlock } from "@/lib/cms/schema";
import {
  getStorefrontTemplateDefinition,
  getStorefrontTemplateSeedDefinition,
  type StorefrontBlockType,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";

export type HomepageSectionChoice = {
  type: StorefrontBlockType;
  label: string;
  description: string;
  editTab: string;
  isCore: boolean;
};

const sectionLabels: Partial<Record<StorefrontBlockType, Pick<HomepageSectionChoice, "label" | "description" | "editTab">>> = {
  countdown: {
    label: "Countdown or launch timer",
    description: "A time-sensitive strip for drops, bookings, events, or limited campaigns.",
    editTab: "page_builder",
  },
  "promo-banner": {
    label: "Promotional section",
    description: "A focused offer area for discounts, direct ordering, campaign copy, or assisted sales.",
    editTab: "page_builder",
  },
  "category-showcase": {
    label: "Category highlights",
    description: "A visual guide to collections, menus, service groups, rooms, or listing types.",
    editTab: "shop_page",
  },
  "featured-products": {
    label: "Main catalog section",
    description: "The primary products, bookings, rooms, listings, menu items, or offers for this template.",
    editTab: "shop_page",
  },
  comparison: {
    label: "Comparison section",
    description: "A side-by-side block for specs, package differences, plans, or product choices.",
    editTab: "template_features",
  },
  "recommended-products": {
    label: "Recommended items",
    description: "A supporting set of suggested products, services, rooms, or next-best offers.",
    editTab: "shop_page",
  },
  "recently-viewed": {
    label: "Recently viewed",
    description: "A returning-customer helper that brings recently seen items back into view.",
    editTab: "shop_page",
  },
  "rich-text": {
    label: "Story or details section",
    description: "A flexible content area for context, benefits, policies, or campaign details.",
    editTab: "page_builder",
  },
  "social-feed": {
    label: "Social proof feed",
    description: "A visual stream for social posts, community moments, or creator-style proof.",
    editTab: "analytics",
  },
  "video-reel": {
    label: "Video section",
    description: "A motion-first section for demos, room tours, product clips, or campaign videos.",
    editTab: "page_builder",
  },
  "faq-accordion": {
    label: "FAQ section",
    description: "Expandable answers for delivery, booking, payments, policies, or common questions.",
    editTab: "faq",
  },
  "trust-badges": {
    label: "Trust badges",
    description: "Small confidence markers for payment, delivery, support, authenticity, or service quality.",
    editTab: "brand_seo",
  },
  testimonials: {
    label: "Testimonials",
    description: "Customer quotes, guest feedback, client proof, or campaign endorsements.",
    editTab: "page_builder",
  },
};

function getCoreSectionTypes(templateId: StorefrontTemplateId): Set<StorefrontBlockType> {
  const seed = getStorefrontTemplateSeedDefinition(templateId);
  const core = new Set<StorefrontBlockType>(["hero"]);

  if (seed.catalogMode === "landing_only") {
    core.add("rich-text");
  } else {
    core.add("featured-products");
  }

  return core;
}

export function getTemplateHomepageSectionChoices(templateId: StorefrontTemplateId): HomepageSectionChoice[] {
  const definition = getStorefrontTemplateDefinition(templateId);
  const seed = getStorefrontTemplateSeedDefinition(templateId);
  const coreTypes = getCoreSectionTypes(templateId);
  const orderedTypes = Array.from(
    new Set<StorefrontBlockType>([
      ...definition.presentation.sectionOrder,
      ...seed.recommendedBlockSet.filter((type): type is StorefrontBlockType =>
        definition.presentation.visibleSections.includes(type as StorefrontBlockType),
      ),
    ]),
  );

  return orderedTypes
    .filter((type) => seed.recommendedBlockSet.includes(type))
    .map((type) => {
      const copy = sectionLabels[type] ?? {
        label: type.replace(/-/g, " "),
        description: "An optional homepage section available for this template.",
        editTab: "page_builder",
      };

      return {
        type,
        label: copy.label,
        description: copy.description,
        editTab: copy.editTab,
        isCore: coreTypes.has(type),
      };
    });
}

export function getOptionalTemplateHomepageSectionChoices(templateId: StorefrontTemplateId) {
  return getTemplateHomepageSectionChoices(templateId).filter((choice) => !choice.isCore);
}

export function createDefaultHomepageSectionVisibility(templateId: StorefrontTemplateId): Record<string, boolean> {
  return Object.fromEntries(
    getOptionalTemplateHomepageSectionChoices(templateId).map((choice) => [choice.type, true]),
  ) as Record<string, boolean>;
}

export function normalizeHomepageSectionVisibility(
  templateId: StorefrontTemplateId,
  value: unknown,
): Record<string, boolean> {
  const optionalChoices = getOptionalTemplateHomepageSectionChoices(templateId);
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};

  return Object.fromEntries(
    optionalChoices.map((choice) => [
      choice.type,
      typeof source[choice.type] === "boolean" ? source[choice.type] : true,
    ]),
  ) as Record<string, boolean>;
}

export function applyHomepageSectionVisibilityToPages(
  pages: StorePage[],
  templateId: StorefrontTemplateId,
  visibility: Record<string, boolean>,
): StorePage[] {
  const coreTypes = getCoreSectionTypes(templateId);

  return pages.map((page) => {
    if (!page.isHomepage) return page;

    return {
      ...page,
      blocks: page.blocks.map((block: StorePageBlock) => {
        if (coreTypes.has(block.type)) {
          return { ...block, isVisible: true, visible: true };
        }

        const enabled = visibility[block.type];
        if (typeof enabled !== "boolean") {
          return block;
        }

        return {
          ...block,
          isVisible: enabled,
          visible: enabled,
        };
      }),
    };
  });
}
