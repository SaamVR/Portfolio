"use client";

import { cn } from "@/lib/utils";
import type { BasicRailItem, BasicTabId } from "../types";

export function BasicRail({
  items,
  activeTab,
  onTabChange,
}: {
  items: BasicRailItem[];
  activeTab: BasicTabId;
  onTabChange: (tab: BasicTabId) => void;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Basic editor sections"
      className="hidden w-16 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 2xl:w-56 lg:flex lg:flex-col"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeTab;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "relative flex h-14 items-center justify-center gap-0.5 border-l-2 px-2 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 2xl:justify-start 2xl:gap-3 2xl:px-3",
              active
                ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-transparent text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="hidden text-sm 2xl:inline">{item.label}</span>
            <span className="2xl:hidden">{item.shortLabel ?? item.label.slice(0, 2)}</span>
            {item.warning ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500" /> : null}
          </button>
        );
      })}
    </nav>
  );
}
