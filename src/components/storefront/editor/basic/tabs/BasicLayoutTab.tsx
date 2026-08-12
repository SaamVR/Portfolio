"use client";

import React from "react";
import { ArrowUp, ArrowDown, Copy, Trash2, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StorePage, StorePageBlock } from "@/lib/cms/schema";
import type { CmsBlockRegistryItem } from "@/lib/cms/block-registry";

interface BasicLayoutTabProps {
  page: StorePage | null;
  availableBlocks?: CmsBlockRegistryItem[];
  reorderBlocks: (startIndex: number, endIndex: number) => void;
  addBlockOfType?: (type: StorePageBlock["type"]) => void;
  removeBlock: (blockId: string) => void;
  duplicateBlock: (blockId: string) => void;
}

export function BasicLayoutTab({
  page,
  availableBlocks = [],
  reorderBlocks,
  addBlockOfType,
  removeBlock,
  duplicateBlock,
}: BasicLayoutTabProps) {
  const blocks = page ? [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder) : [];

  return (
    <div data-testid="basic-tab-layout" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Arrange the page</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Reorder sections, duplicate blocks, and manage storefront structure.</p>
        </div>
      </div>

      <div className="space-y-2">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="h-4 w-4 shrink-0 text-gray-400 cursor-grab" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {block.props?.title ? String(block.props.title) : block.type}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                    {block.type}
                  </Badge>
                </div>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  #{block.id.slice(0, 8)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-500"
                disabled={index === 0}
                onClick={() => reorderBlocks(index, index - 1)}
                title="Move Up"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-500"
                disabled={index === blocks.length - 1}
                onClick={() => reorderBlocks(index, index + 1)}
                title="Move Down"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-500"
                onClick={() => duplicateBlock(block.id)}
                title="Duplicate"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => removeBlock(block.id)}
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {availableBlocks.length > 0 && addBlockOfType ? (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
            Add Section Block
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {availableBlocks.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => addBlockOfType(item.value)}
                className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50/50 p-2.5 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-50/30 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-emerald-500"
              >
                <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{item.label}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
