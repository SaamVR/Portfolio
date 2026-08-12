"use client";

import React from "react";
import { VisualCssInspector } from "@/components/storefront/VisualCssInspector";
import { BlockAdvancedControls } from "./BlockAdvancedControls";
import type { StorePage, StorePageBlock } from "@/lib/cms/schema";

export interface StyleTabProps {
  selectedBlock: StorePageBlock | null;
  updateSelectedBlockProps: (props: Record<string, unknown>) => void;
  updateSelectedBlockMeta?: (patch: Partial<StorePageBlock>) => void;
  viewport?: "desktop" | "tablet" | "mobile";
  storeId?: string;
  allPages?: StorePage[];
}

export function StyleTab({
  selectedBlock,
  updateSelectedBlockProps,
  updateSelectedBlockMeta,
  viewport = "desktop",
  storeId,
  allPages,
}: StyleTabProps) {
  return (
    <div data-testid="advanced-inspector-tab-style" className="p-4 space-y-6">
      {selectedBlock ? (
        <BlockAdvancedControls
          selectedBlock={selectedBlock}
          updateSelectedBlockProps={updateSelectedBlockProps}
          storeId={storeId}
          allPages={allPages}
        />
      ) : null}

      <div>
        <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-3">
          CSS & Breakpoint Styles
        </h4>
        <VisualCssInspector
          selectedBlock={selectedBlock}
          updateSelectedBlockProps={updateSelectedBlockProps}
          updateSelectedBlock={updateSelectedBlockMeta}
          viewport={viewport}
          allowCodeEditing
        />
      </div>
    </div>
  );
}
