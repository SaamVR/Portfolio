"use client";

import { BlogHomepageWidget } from "@/components/storefront/blog/BlogHomepageWidget";
import { StorefrontAdminMode } from "@/components/storefront/StorefrontAdminMode";
import { StorefrontBlockRenderer } from "@/components/storefront/StorefrontBlockRenderer";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { FashionV3Shell } from "@/components/storefront/fashion-v3/FashionV3Shell";
import { FashionV3BlockRenderer } from "@/components/storefront/fashion-v3/FashionV3BlockRenderer";
import { ThreadsShell } from "@/components/storefront/threads/ThreadsShell";
import { ThreadsBlockRenderer } from "@/components/storefront/threads/ThreadsBlockRenderer";
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
  _template: StorefrontTemplateDefinition,
): StorePageBlock[] {
  // Persisted page-builder order is authoritative on every template. Template sectionOrder
  // is used when a template seeds the page, not as a competing runtime ordering system.
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
  const blocksToRender = sortBlocksForTemplate(blocks, template).filter(isBlockVisible);
  const hasComposableBlogBlock = blocksToRender.some(
    (block) => block.type === "rich-text" && block.layoutVariant === "blog-posts",
  );

  const pageContent = (
    <>
      <div data-template-renderer={templateId === "fashion" ? "fashion-v3" : templateId === "threads" ? "threads-earthy" : "composable-blocks"} data-template-homepage={page.isHomepage ? "true" : "false"}>
        {blocksToRender.map((block, index) => (
          <div
            key={block.id}
            data-ezcomo-block-id={block.id}
            data-ezcomo-block-type={block.type}
            onClick={() => {
              if (canManageStorefront && adminMode) onSelectBlock(block.id);
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
            {canManageStorefront && adminMode ? <StorefrontAdminMode pageId={page.id} block={block} index={index} /> : null}
            {templateId === "fashion" ? <FashionV3BlockRenderer block={block} template={template} /> : templateId === "threads" ? <ThreadsBlockRenderer block={block} template={template} /> : <StorefrontBlockRenderer block={block} template={template} />}
          </div>
        ))}
      </div>
      {templateId !== "fashion" && templateId !== "threads" && page.isHomepage && !hasComposableBlogBlock ? <BlogHomepageWidget /> : null}
    </>
  );

  if (templateId === "fashion") {
    return <FashionV3Shell embedded={embedded}>{pageContent}</FashionV3Shell>;
  }

  if (templateId === "threads") {
    return <ThreadsShell embedded={embedded}>{pageContent}</ThreadsShell>;
  }

  return <StorefrontShell templateId={templateId} template={template} embedded={embedded}>{pageContent}</StorefrontShell>;
}
