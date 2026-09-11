"use client";

import { BlogHomepageWidget } from "@/components/storefront/blog/BlogHomepageWidget";
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
import { getStorefrontExperienceProfile } from "@/lib/storefront-template-experience";
import { cn } from "@/lib/utils";
import experienceStyles from "./StorefrontTemplateExperience.module.css";

function sortBlocksForTemplate(
  blocks: StorePageBlock[],
  _template: StorefrontTemplateDefinition,
): StorePageBlock[] {
  // Persisted page-builder order stays authoritative. Template DNA controls presentation,
  // not merchant-authored runtime ordering.
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

function hasConfiguredTrustBadges(block: StorePageBlock) {
  if (block.type !== "trust-badges") return true;
  const props = block.props as Record<string, unknown> | undefined;
  const badges = Array.isArray(props?.badges) ? props?.badges : [];
  return badges.some((badge) => {
    if (!badge || typeof badge !== "object") return false;
    const candidate = badge as Record<string, unknown>;
    return typeof candidate.label === "string" && candidate.label.trim().length > 0;
  });
}

function isBlockRenderable(block: StorePageBlock, revealEditableEmptyBlocks: boolean): boolean {
  const visible = block.isVisible ?? block.visible ?? true;
  if (!visible) return false;
  if (revealEditableEmptyBlocks) return true;
  return hasConfiguredTrustBadges(block);
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
  const experience = getStorefrontExperienceProfile(templateId);
  const revealEditableEmptyBlocks = canManageStorefront && adminMode;
  const blocksToRender = sortBlocksForTemplate(blocks, template).filter((block) => isBlockRenderable(block, revealEditableEmptyBlocks));
  const hasComposableBlogBlock = blocksToRender.some(
    (block) => block.type === "rich-text" && block.layoutVariant === "blog-posts",
  );

  return (
    <StorefrontShell templateId={templateId} template={template} embedded={embedded}>
      <div
        className={experienceStyles.experience}
        data-template-renderer="composable-blocks"
        data-template-homepage={page.isHomepage ? "true" : "false"}
        data-template-experience={experience.hero}
      >
        {blocksToRender.map((block, index) => {
          const decisionRank = experience.decisionPriority.indexOf(block.type);
          return (
            <div
              key={block.id}
              data-ezcomo-block-id={block.id}
              data-ezcomo-block-type={block.type}
              data-template-block-index={index}
              data-template-decision-rank={decisionRank >= 0 ? decisionRank + 1 : undefined}
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
        })}
      </div>
      {page.isHomepage && !hasComposableBlogBlock ? <BlogHomepageWidget /> : null}
    </StorefrontShell>
  );
}
