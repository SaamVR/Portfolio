"use client";

import React from "react";
import { Eye, EyeOff, Trash2, ArrowUp, ArrowDown, Lock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StorePageBlock } from "@/lib/cms/schema";

export interface BlockTreeNodeProps {
  block: StorePageBlock;
  index: number;
  totalBlocks: number;
  isSelected: boolean;
  onSelectBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 1 | -1) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
  onRemoveBlock: (id: string) => void;
}

export function BlockTreeNode({
  block,
  index,
  totalBlocks,
  isSelected,
  onSelectBlock,
  onMoveBlock,
  onToggleVisibility,
  onRemoveBlock,
}: BlockTreeNodeProps) {
  const isVisible = block.isVisible ?? block.visible ?? true;

  return (
    <div
      data-testid={`advanced-tree-node-${block.id}`}
      className={cn(
        "group flex h-9 items-center justify-between rounded-lg px-2 text-xs transition-colors select-none",
        isSelected
          ? "bg-emerald-50 text-emerald-900 font-medium dark:bg-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500"
          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
        !isVisible && "opacity-50"
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={() => onSelectBlock(block.id)}
        aria-pressed={isSelected}
      >
        <Layers className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="truncate">
          {block.props?.title ? String(block.props.title) : block.type}
        </span>
        <span className="text-[10px] text-gray-400 font-mono shrink-0">({block.type})</span>
      </button>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          onClick={(e) => {
            e.stopPropagation();
            onMoveBlock(block.id, -1);
          }}
          disabled={index === 0}
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          onClick={(e) => {
            e.stopPropagation();
            onMoveBlock(block.id, 1);
          }}
          disabled={index === totalBlocks - 1}
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(block.id, !isVisible);
          }}
        >
          {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveBlock(block.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
