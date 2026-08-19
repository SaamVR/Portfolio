"use client";

import type { ReactElement } from "react";

import { StorefrontAdminMode } from "@/components/storefront/StorefrontAdminMode";
import { BeautyStorefrontRenderer } from "@/components/storefront/beauty/BeautyStorefrontRenderer";
import { BookingStorefrontRenderer } from "@/components/storefront/booking/BookingStorefrontRenderer";
import { CraftsStorefrontRenderer } from "@/components/storefront/crafts/CraftsStorefrontRenderer";
import { DigitalDownloadsStorefrontRenderer } from "@/components/storefront/digital-downloads/DigitalDownloadsStorefrontRenderer";
import { ElectronicsStorefrontRenderer } from "@/components/storefront/electronics/ElectronicsStorefrontRenderer";
import { FoodStorefrontRenderer } from "@/components/storefront/food/FoodStorefrontRenderer";
import { GeneralCatalogStorefrontRenderer } from "@/components/storefront/general-catalog/GeneralCatalogStorefrontRenderer";
import { HotelStorefrontRenderer } from "@/components/storefront/hotel/HotelStorefrontRenderer";
import { InquiryCatalogStorefrontRenderer } from "@/components/storefront/inquiry/InquiryCatalogStorefrontRenderer";
import { LandingStorefrontRenderer } from "@/components/storefront/landing/LandingStorefrontRenderer";
import { RealEstateStorefrontRenderer } from "@/components/storefront/real-estate/RealEstateStorefrontRenderer";
import { ServiceStorefrontRenderer } from "@/components/storefront/service/ServiceStorefrontRenderer";
import { SingleProductStorefrontRenderer } from "@/components/storefront/single-product/SingleProductStorefrontRenderer";
import { SubscriptionsStorefrontRenderer } from "@/components/storefront/subscriptions/SubscriptionsStorefrontRenderer";
import { BlogHomepageWidget } from "@/components/storefront/blog/BlogHomepageWidget";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { getSpecializedTemplateConsumedBlocks } from "@/lib/cms/template-renderer-context";
import type { Store, StorePage, StorePageBlock } from "@/lib/cms/schema";
import {
  getStorefrontTemplateDefinition,
  resolveStorefrontTemplateId,
  type StorefrontTemplateDefinition,
  type StorefrontTemplateId,
} from "@/lib/cms/storefront-templates";
import { cn } from "@/lib/utils";

type SpecializedHomepageRendererProps = {
  store: Store;
  page: StorePage;
  blocks: StorePageBlock[];
};

const specializedHomepageRenderers: Partial<Record<StorefrontTemplateId, (props: SpecializedHomepageRendererProps) => ReactElement>> = {
  beauty: (props) => <BeautyStorefrontRenderer {...props} />,
  landing: (props) => <LandingStorefrontRenderer {...props} />,
  electronics: (props) => <ElectronicsStorefrontRenderer {...props} />,
  food: (props) => <FoodStorefrontRenderer {...props} />,
  subscriptions: (props) => <SubscriptionsStorefrontRenderer {...props} />,
  "digital-downloads": (props) => <DigitalDownloadsStorefrontRenderer {...props} />,
  "general-catalog": (props) => <GeneralCatalogStorefrontRenderer {...props} />,
  crafts: (props) => <CraftsStorefrontRenderer {...props} />,
  "single-product": (props) => <SingleProductStorefrontRenderer {...props} />,
  "inquiry-catalog": (props) => <InquiryCatalogStorefrontRenderer {...props} />,
  service: (props) => <ServiceStorefrontRenderer {...props} />,
  booking: (props) => <BookingStorefrontRenderer {...props} />,
  hotel: (props) => <HotelStorefrontRenderer {...props} />,
  "real-estate": (props) => <RealEstateStorefrontRenderer {...props} />,
};

function sortBlocksForTemplate(
  blocks: StorePageBlock[],
  template: StorefrontTemplateDefinition,
  options?: { preserveEditorOrder?: boolean },
): StorePageBlock[] {
  if (options?.preserveEditorOrder) {
    return [...blocks].sort((left, right) => left.sortOrder - right.sortOrder);
  }

  const visibleSet = new Set(template.presentation.visibleSections);
  const orderMap = new Map(template.presentation.sectionOrder.map((type, index) => [type, index]));

  return [...blocks]
    .filter((block) => visibleSet.size === 0 || visibleSet.has(block.type))
    .sort((left, right) => {
      const leftOrder = orderMap.get(left.type) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderMap.get(right.type) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.sortOrder - right.sortOrder;
    });
}

function resolveTemplateForStore(store: Store): {
  templateId: StorefrontTemplateId;
  template: StorefrontTemplateDefinition;
} {
  const storefrontProfile = typeof store.siteSettings?.storefront_profile === "object" && store.siteSettings?.storefront_profile
    ? store.siteSettings.storefront_profile as Record<string, unknown>
    : null;
  const templateId = resolveStorefrontTemplateId(
    storefrontProfile?.template_id,
    {
      templateSeedId: typeof storefrontProfile?.template_id === "string" ? storefrontProfile.template_id : null,
      productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
    },
  );

  return {
    templateId,
    template: getStorefrontTemplateDefinition(templateId),
  };
}

function isBlockVisible(block: StorePageBlock): boolean {
  return block.isVisible ?? block.visible ?? true;
}

export function StorefrontTemplateRenderer({
  store,
  page,
  blocks,
  adminMode,
  selectedBlockId,
  canManageStorefront,
  onSelectBlock,
  embedded = false,
}: {
  store: Store;
  page: StorePage;
  blocks: StorePageBlock[];
  adminMode: boolean;
  selectedBlockId: string | null;
  canManageStorefront: boolean;
  onSelectBlock: (blockId: string) => void;
  embedded?: boolean;
}) {
  const { template, templateId } = resolveTemplateForStore(store);
  const blocksToRender = sortBlocksForTemplate(blocks, template, {
    preserveEditorOrder: adminMode,
  }).filter(isBlockVisible);
  const renderBlockNode = (block: StorePageBlock, index: number) => (
    <div
      key={block.id}
      data-ezcomo-block-id={block.id}
      onClick={() => {
        if (canManageStorefront && adminMode) {
          onSelectBlock(block.id);
        }
      }}
      className={cn(
        "relative transition-shadow",
        (block.props as Record<string, unknown> | undefined)?.hideOnMobile === true && "max-sm:hidden",
        (block.props as Record<string, unknown> | undefined)?.hideOnTablet === true && "sm:max-lg:hidden",
        (block.props as Record<string, unknown> | undefined)?.hideOnDesktop === true && "lg:hidden",
        canManageStorefront && adminMode && "cursor-pointer ring-1 ring-inset ring-primary/20 hover:ring-primary/40",
        selectedBlockId === block.id && "ring-2 ring-primary/50",
      )}
    >
      {canManageStorefront && adminMode ? (
        <StorefrontAdminMode pageId={page.id} block={block} index={index} />
      ) : null}
      <StorefrontBlockRenderer block={block} template={template} />
    </div>
  );
  const blockNodes = blocksToRender.map((block, index) => renderBlockNode(block, index));
  const consumedBlockTypes = new Set(page.isHomepage ? getSpecializedTemplateConsumedBlocks(templateId) : []);
  const fallbackBlockNodes = blocksToRender
    .filter((block) => !consumedBlockTypes.has(block.type))
    .map((block, index) => renderBlockNode(block, index));
  const specializedHomepageRenderer = page.isHomepage ? specializedHomepageRenderers[templateId] : undefined;

  const renderedBlocks = adminMode || template.rendererKind === "fashion"
    ? blockNodes
    : specializedHomepageRenderer
      ? specializedHomepageRenderer({ store, page, blocks: blocksToRender })
    : (
      <div data-template-renderer="generic-placeholder">
        {blockNodes}
      </div>
    );

  return (
    <StorefrontShell templateId={templateId} template={template} embedded={embedded}>
      {renderedBlocks}
      {page.isHomepage && template.rendererKind !== "fashion" && fallbackBlockNodes.length > 0 ? (
        <div data-template-renderer="shared-fallback-blocks">
          {fallbackBlockNodes}
        </div>
      ) : null}
      {page.isHomepage ? <BlogHomepageWidget /> : null}
    </StorefrontShell>
  );
}
