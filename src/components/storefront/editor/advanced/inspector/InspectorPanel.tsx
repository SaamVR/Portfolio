"use client";

import React, { useState } from "react";
import { Type, Sliders, Monitor, Database, Settings } from "lucide-react";
import { BasicBlockMiniEditor } from "@/components/storefront/BasicBlockMiniEditor";
import { StyleTab } from "./StyleTab";
import { ResponsiveTab } from "./ResponsiveTab";
import { DataBindingTab } from "./DataBindingTab";
import type { StorePage, StorePageBlock } from "@/lib/cms/schema";

export interface InspectorPanelProps {
  selectedBlock: StorePageBlock | null;
  updateSelectedBlockProps: (props: Record<string, unknown>) => void;
  updateSelectedBlockMeta?: (patch: Partial<StorePageBlock>) => void;
  viewport?: "desktop" | "tablet" | "mobile";
  onViewportChange?: (vp: "desktop" | "tablet" | "mobile") => void;
  storeId?: string;
  allPages?: StorePage[];
}

export function InspectorPanel({
  selectedBlock,
  updateSelectedBlockProps,
  updateSelectedBlockMeta,
  viewport = "desktop",
  onViewportChange,
  storeId,
  allPages,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "responsive" | "data">("content");

  if (!selectedBlock) {
    return (
      <div data-testid="advanced-inspector-panel" className="flex h-full w-[320px] flex-col items-center justify-center border-l border-gray-200 bg-white p-6 text-center text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900">
        <Settings className="h-8 w-8 mb-2 opacity-40" />
        <p className="font-medium text-gray-600 dark:text-gray-300">No Block Selected</p>
        <p className="mt-1">Click a section in the DOM Navigator or Canvas to inspect properties.</p>
      </div>
    );
  }

  return (
    <div data-testid="advanced-inspector-panel" className="flex h-full w-[320px] flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
              {selectedBlock.props?.title ? String(selectedBlock.props.title) : selectedBlock.type}
            </h3>
            <p className="text-[10px] text-gray-500 font-mono">#{selectedBlock.id.slice(0, 8)}</p>
          </div>
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {selectedBlock.type}
          </span>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-1 gap-1">
        {[
          { id: "content", label: "Content", icon: Type },
          { id: "style", label: "Style", icon: Sliders },
          { id: "responsive", label: "Responsive", icon: Monitor },
          { id: "data", label: "Data Source", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as "content" | "style" | "responsive" | "data")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100 font-semibold"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "content" ? (
          <div data-testid="advanced-inspector-tab-content" className="p-4">
            <BasicBlockMiniEditor
              block={selectedBlock}
              storeId={storeId ?? ""}
              updateBlockProps={(_blockId, patch) => updateSelectedBlockProps(patch)}
              updateBlockMeta={(_blockId, patch) => updateSelectedBlockMeta?.(patch)}
              allPages={allPages}
            />
          </div>
        ) : null}

        {activeTab === "style" ? (
          <StyleTab
            selectedBlock={selectedBlock}
            updateSelectedBlockProps={updateSelectedBlockProps}
            updateSelectedBlockMeta={updateSelectedBlockMeta}
            viewport={viewport}
            storeId={storeId}
            allPages={allPages}
          />
        ) : null}

        {activeTab === "responsive" ? (
          <ResponsiveTab
            selectedBlock={selectedBlock}
            viewport={viewport}
            onViewportChange={(vp) => onViewportChange?.(vp)}
            updateSelectedBlockProps={updateSelectedBlockProps}
          />
        ) : null}

        {activeTab === "data" ? (
          <DataBindingTab
            selectedBlock={selectedBlock}
            updateSelectedBlockProps={updateSelectedBlockProps}
          />
        ) : null}
      </div>
    </div>
  );
}
