"use client";

import { cn } from "@/lib/utils";
import type { BasicRailItem, BasicTabId } from "../types";

export function BasicTabPillBar({
  items,
  activeTab,
  onTabChange,
}: {
  items: BasicRailItem[];
  activeTab: BasicTabId;
  onTabChange: (tab: BasicTabId) => void;
}) {
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-900 lg:hidden">
      <div role="tablist" aria-label="Basic editor sections" className="flex snap-x gap-2 overflow-x-auto">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === activeTab}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "min-h-11 shrink-0 snap-start rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
              item.id === activeTab
                ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
