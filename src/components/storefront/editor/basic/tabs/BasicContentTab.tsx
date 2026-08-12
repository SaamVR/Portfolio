"use client";

import React from "react";
import { CheckCircle2, EyeOff, Layers3, MousePointer2 } from "lucide-react";
import { BasicBlockMiniEditor } from "@/components/storefront/BasicBlockMiniEditor";
import { Badge } from "@/components/ui/badge";
import type { StorePage, StorePageBlock } from "@/lib/cms/schema";
import { cn } from "@/lib/utils";

interface BasicContentTabProps {
  page: StorePage | null;
  storeId?: string;
  focusedBlockId?: string | null;
  onFocusBlock?: (blockId: string | null) => void;
  updateBlockProps: (blockId: string, patch: Record<string, unknown>) => void;
  updateBlockMeta?: (blockId: string, patch: Partial<StorePageBlock>) => void;
  allPages?: StorePage[];
}

type BasicBlockGroupId = "lead" | "products" | "story" | "trust" | "other";

const BLOCK_GROUPS: Record<
  BasicBlockGroupId,
  {
    label: string;
    helper: string;
    match: StorePageBlock["type"][];
  }
> = {
  lead: {
    label: "Opening & offers",
    helper: "Hero, promo, and campaign sections.",
    match: ["hero", "promo-banner", "countdown"],
  },
  products: {
    label: "Products",
    helper: "Shopping and discovery sections.",
    match: ["category-showcase", "featured-products", "recommended-products", "recently-viewed", "comparison"],
  },
  story: {
    label: "Story & media",
    helper: "Brand copy, reels, and social content.",
    match: ["rich-text", "video-reel", "social-feed"],
  },
  trust: {
    label: "Trust",
    helper: "Proof, questions, and reassurance.",
    match: ["trust-badges", "testimonials", "faq-accordion"],
  },
  other: {
    label: "Other sections",
    helper: "Template-specific or custom storefront blocks.",
    match: [],
  },
};

const GROUP_ORDER: BasicBlockGroupId[] = ["lead", "products", "story", "trust", "other"];

function getBlockGroupId(type: StorePageBlock["type"]): BasicBlockGroupId {
  return GROUP_ORDER.find((groupId) => BLOCK_GROUPS[groupId].match.includes(type)) ?? "other";
}

function getBlockTitle(block: StorePageBlock) {
  const props = block.props as Record<string, unknown>;
  const title = props.title ?? props.heading ?? props.name ?? props.badgeText;
  return title ? String(title) : block.type.replace(/-/g, " ");
}

function getBlockSubtitle(block: StorePageBlock) {
  const props = block.props as Record<string, unknown>;
  const subtitle = props.subtitle ?? props.tagline ?? props.eyebrow;
  return subtitle ? String(subtitle) : "Click to edit this section";
}

export function BasicContentTab({
  page,
  storeId,
  focusedBlockId,
  onFocusBlock,
  updateBlockProps,
  updateBlockMeta,
  allPages,
}: BasicContentTabProps) {
  const blocks = page ? [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const selectedBlock = blocks.find((block) => block.id === focusedBlockId) ?? blocks[0] ?? null;
  const selectedIndex = selectedBlock ? blocks.findIndex((block) => block.id === selectedBlock.id) : -1;
  const groupedBlocks = GROUP_ORDER.map((groupId) => ({
    id: groupId,
    ...BLOCK_GROUPS[groupId],
    blocks: blocks.filter((block) => getBlockGroupId(block.type) === groupId),
  })).filter((group) => group.blocks.length > 0);

  React.useEffect(() => {
    if (!focusedBlockId && selectedBlock) {
      onFocusBlock?.(selectedBlock.id);
    }
  }, [focusedBlockId, onFocusBlock, selectedBlock]);

  if (blocks.length === 0) {
    return (
      <div data-testid="basic-tab-content" className="p-6 text-center text-xs text-gray-500">
        No blocks found on this page. Switch to the Layout tab to add sections.
      </div>
    );
  }

  return (
    <div data-testid="basic-tab-content" className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-50">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-emerald-600 p-2 text-white shadow-sm">
            <MousePointer2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Edit one section at a time</h3>
            <p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-100/80">
              Pick a storefront section, edit only that block, and use the preview as your visual guide.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Page sections</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Shopify-style navigator for this page.</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {blocks.length} sections
          </Badge>
        </div>

        <div className="max-h-[34vh] space-y-3 overflow-y-auto pr-1">
          {groupedBlocks.map((group) => (
            <div key={group.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                  {group.label}
                </p>
                <span className="text-[10px] text-gray-400">{group.blocks.length}</span>
              </div>
              <div className="space-y-1.5">
                {group.blocks.map((block) => {
                  const active = selectedBlock?.id === block.id;
                  const isVisible = block.isVisible ?? block.visible ?? true;
                  const blockIndex = blocks.findIndex((candidate) => candidate.id === block.id);

                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => onFocusBlock?.(block.id)}
                      className={cn(
                        "group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                        active
                          ? "border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-500 dark:border-emerald-500 dark:bg-emerald-950/30"
                          : "border-gray-200 bg-gray-50/70 hover:border-emerald-300 hover:bg-white dark:border-gray-800 dark:bg-gray-950/40 dark:hover:border-emerald-800 dark:hover:bg-gray-900",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                          active
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-gray-500 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-800",
                        )}
                      >
                        {blockIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold capitalize text-gray-900 dark:text-gray-100">
                            {getBlockTitle(block)}
                          </span>
                          {!isVisible ? <EyeOff className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : null}
                          {active ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> : null}
                        </span>
                        <span className="mt-0.5 line-clamp-1 text-[11px] text-gray-500 dark:text-gray-400">
                          {getBlockSubtitle(block)}
                        </span>
                        <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:ring-gray-800">
                          {block.type}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedBlock ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                    Selected section
                  </p>
                </div>
                <h4 className="mt-1 truncate text-base font-semibold capitalize text-gray-950 dark:text-gray-50">
                  {getBlockTitle(selectedBlock)}
                </h4>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Section {selectedIndex + 1} of {blocks.length}. Preview should highlight this block while you edit.
                </p>
              </div>
              <Badge variant={(selectedBlock.isVisible ?? selectedBlock.visible ?? true) ? "secondary" : "outline"} className="shrink-0">
                {(selectedBlock.isVisible ?? selectedBlock.visible ?? true) ? "Visible" : "Hidden"}
              </Badge>
            </div>
          </div>
          <div className="p-4">
            <BasicBlockMiniEditor
              block={selectedBlock}
              storeId={storeId || ""}
              updateBlockProps={(bId: string, patch: Record<string, unknown>) => updateBlockProps(bId, patch)}
              updateBlockMeta={(bId: string, patch: Partial<StorePageBlock>) => updateBlockMeta?.(bId, patch)}
              allPages={allPages}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
