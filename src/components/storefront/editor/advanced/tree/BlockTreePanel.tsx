"use client";

import React, { useState } from "react";
import { Search, Plus, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BlockTreeNode } from "./BlockTreeNode";
import type { StorePage, StorePageBlock } from "@/lib/cms/schema";
import type { CmsBlockRegistryItem } from "@/lib/cms/block-registry";

export interface BlockTreePanelProps {
  page: StorePage;
  availableBlocks?: CmsBlockRegistryItem[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 1 | -1) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onRemoveBlock: (id: string) => void;
  onAddBlock?: (type: StorePageBlock["type"]) => void;
}

export function BlockTreePanel({
  page,
  availableBlocks = [],
  selectedBlockId,
  onSelectBlock,
  onMoveBlock,
  onToggleVisibility,
  onRemoveBlock,
  onAddBlock,
}: BlockTreePanelProps) {
  const [search, setSearch] = useState("");
  const sortedBlocks = [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  const filteredBlocks = search
    ? sortedBlocks.filter(
        (b) =>
          b.type.toLowerCase().includes(search.toLowerCase()) ||
          String(b.props?.title || "").toLowerCase().includes(search.toLowerCase())
      )
    : sortedBlocks;

  return (
    <div data-testid="advanced-tree-panel" className="flex h-full w-[260px] flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Search and header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100">
            <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>DOM Navigator</span>
          </div>
          <Plus className="h-4 w-4 text-gray-400" />
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter blocks..."
            className="h-8 pl-8 text-xs bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>

      {/* Tree list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredBlocks.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400">
            {search ? "No matching blocks" : "No blocks on this page"}
          </div>
        ) : (
          filteredBlocks.map((block) => {
            const blockIndex = sortedBlocks.findIndex((candidate) => candidate.id === block.id);

            return (
              <BlockTreeNode
                key={block.id}
                block={block}
                index={blockIndex}
                totalBlocks={sortedBlocks.length}
                isSelected={selectedBlockId === block.id}
                onSelectBlock={onSelectBlock}
                onMoveBlock={onMoveBlock}
                onToggleVisibility={onToggleVisibility}
                onRemoveBlock={onRemoveBlock}
              />
            );
          })
        )}
      </div>

      {onAddBlock && availableBlocks.length > 0 ? (
        <div className="border-t border-gray-200 p-2 dark:border-gray-800">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            Add block
          </label>
          <select
            className="mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
            defaultValue=""
            onChange={(event) => {
              const nextType = event.target.value as StorePageBlock["type"];
              if (!nextType) return;
              onAddBlock(nextType);
              event.currentTarget.value = "";
            }}
          >
            <option value="">Choose section...</option>
            {availableBlocks.map((block) => (
              <option key={block.value} value={block.value}>
                {block.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
