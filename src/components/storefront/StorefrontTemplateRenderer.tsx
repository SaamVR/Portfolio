"use client";

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

function sortBlocksForTemplate(
  blocks: StorePageBlock[],
  template: StorefrontTemplateDefinition,
): StorePageBlock[] {
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
      blueprintId: typeof storefrontProfile?.blueprint_id === "string" ? storefrontProfile.blueprint_id : null,
      productVisibility: typeof storefrontProfile?.product_visibility === "string" ? storefrontProfile.product_visibility : null,
    },
  );

  return {
    templateId,
    template: getStorefrontTemplateDefinition(templateId),
  };
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
  const blocksToRender = sortBlocksForTemplate(blocks, template);
  const renderBlockNode = (block: StorePageBlock, index: number) => (
    <div
      key={block.id}
      onClick={() => {
        if (canManageStorefront && adminMode) {
          onSelectBlock(block.id);
        }
      }}
      className={cn(
        "relative transition-shadow",
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

  const renderedBlocks = template.rendererKind === "fashion"
    ? blockNodes
    : templateId === "beauty" && page.isHomepage
      ? <BeautyStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "landing" && page.isHomepage
      ? <LandingStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "electronics" && page.isHomepage
      ? <ElectronicsStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "food" && page.isHomepage
      ? <FoodStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "subscriptions" && page.isHomepage
      ? <SubscriptionsStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "digital-downloads" && page.isHomepage
      ? <DigitalDownloadsStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "general-catalog" && page.isHomepage
      ? <GeneralCatalogStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "crafts" && page.isHomepage
      ? <CraftsStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "single-product" && page.isHomepage
      ? <SingleProductStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "inquiry-catalog" && page.isHomepage
      ? <InquiryCatalogStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "service" && page.isHomepage
      ? <ServiceStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "booking" && page.isHomepage
      ? <BookingStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "hotel" && page.isHomepage
      ? <HotelStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
    : templateId === "real-estate" && page.isHomepage
      ? <RealEstateStorefrontRenderer store={store} page={page} blocks={blocksToRender} />
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
    </StorefrontShell>
  );
}
