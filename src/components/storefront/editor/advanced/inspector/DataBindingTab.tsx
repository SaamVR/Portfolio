"use client";

import React from "react";
import { PropertyRow } from "@/components/storefront/editor/shared/PropertyRow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { StorePageBlock } from "@/lib/cms/schema";

export interface DataBindingTabProps {
  selectedBlock: StorePageBlock | null;
  updateSelectedBlockProps: (props: Record<string, unknown>) => void;
}

export function DataBindingTab({
  selectedBlock,
  updateSelectedBlockProps,
}: DataBindingTabProps) {
  if (!selectedBlock) {
    return (
      <div className="p-4 text-center text-xs text-gray-500">
        Select a block to inspect data bindings.
      </div>
    );
  }

  const propsObj = (selectedBlock.props || {}) as Record<string, unknown>;
  const currentSource = typeof propsObj.source === "string" ? propsObj.source : "featured-or-all";
  const limit = Number(propsObj.limit ?? 8);
  const category = typeof propsObj.category === "string" ? propsObj.category : "";
  const productType = typeof propsObj.productType === "string" ? propsObj.productType : "";
  const supportsProductSource = ["featured-products", "recommended-products", "comparison"].includes(selectedBlock.type);
  const supportsCategorySource = selectedBlock.type === "category-showcase";

  if (!supportsProductSource && !supportsCategorySource) {
    return (
      <div data-testid="advanced-inspector-tab-data" className="p-4 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
            Dynamic Data Sources
          </h4>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            This block renders from its own content fields. Use the Content tab for editable data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="advanced-inspector-tab-data" className="p-4 space-y-6">
      <div>
        <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
          Dynamic Data Sources
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Bind products, collections, and inventory query limits to this section.
        </p>
      </div>

      <div className="space-y-4">
        <PropertyRow label="Catalog Source" help="Choose which catalog data populates this block">
          <Select
            value={supportsCategorySource ? (typeof propsObj.source === "string" ? propsObj.source : "auto") : currentSource}
            onValueChange={(val) => updateSelectedBlockProps({ source: val })}
          >
            <SelectTrigger className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportsCategorySource ? (
                <>
                  <SelectItem value="auto" className="text-xs">Auto choose best available</SelectItem>
                  <SelectItem value="categories" className="text-xs">Product categories</SelectItem>
                  <SelectItem value="types" className="text-xs">Product types</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="featured-or-all" className="text-xs">Featured first, then all</SelectItem>
                  <SelectItem value="featured" className="text-xs">Featured products only</SelectItem>
                  <SelectItem value="all" className="text-xs">All available products</SelectItem>
                  <SelectItem value="newest" className="text-xs">Newest products</SelectItem>
                  <SelectItem value="category" className="text-xs">One category</SelectItem>
                  <SelectItem value="type" className="text-xs">One product type</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow label="Max Items Displayed" help="Maximum number of items fetched and rendered">
          <Input
            type="number"
            min={1}
            max={48}
            value={Number.isFinite(limit) ? limit : 8}
            onChange={(e) => updateSelectedBlockProps({ limit: Math.max(1, Math.min(48, Number(e.target.value || 1))) })}
            className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          />
        </PropertyRow>

        {supportsProductSource && currentSource === "category" ? (
          <PropertyRow label="Category Filter" help="Match the product category value used in the catalog">
            <Input
              type="text"
              value={category}
              onChange={(e) => updateSelectedBlockProps({ category: e.target.value })}
              placeholder="e.g. Headphones"
              className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
            />
          </PropertyRow>
        ) : null}

        {supportsProductSource && currentSource === "type" ? (
          <PropertyRow label="Product Type Filter" help="Match the product type value used in the catalog">
            <Input
              type="text"
              value={productType}
              onChange={(e) => updateSelectedBlockProps({ productType: e.target.value })}
              placeholder="e.g. Wireless"
              className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
            />
          </PropertyRow>
        ) : null}
      </div>
    </div>
  );
}
