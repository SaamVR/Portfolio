"use client";

import { StorefrontAdminMode } from "@/components/storefront/StorefrontAdminMode";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
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
  options?: { preserveEditorOrder?: boolean },
): StorePageBlock[] {
  // Once a merchant has an explicit block order, that order is authoritative on every
  // template. Template sectionOrder remains a seed/default concern rather than a second
  // runtime ordering system that can fight the page builder.
  if (options?.preserveEditorOrder) {
    return [...blocks].sort((left, right) => left.sortOrder - right.sortOrder);
  }

  return [...blocks].sort((left, right) => left.sortOrder - right.sortOrder);
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
    preserveEditorOrder: true,
  }).filter(isBlockVisible);

  return (
    <StorefrontShell templateId={templateId} template={template} embedded={embedded}>
      <div data-template-renderer="composable-blocks" data-template-homepage={page.isHomepage ? "true" : "false"}>
        {blocksToRender.map((block, index) => (
          <div
            key={block.id}
            data-ezcomo-block-id={block.id}
            data-ezcomo-block-type={block.type}
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
        ))}
      </div>
    </StorefrontShell>
  );
}
