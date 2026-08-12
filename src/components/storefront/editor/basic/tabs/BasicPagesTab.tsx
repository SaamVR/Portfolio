"use client";

import React from "react";
import { Plus, LayoutGrid, FileText, ShoppingBag, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StorePage } from "@/lib/cms/schema";

interface BasicPagesTabProps {
  page: StorePage | null;
  allPages: StorePage[];
  selectPage: (pageId: string) => void;
  onCreatePage?: () => void;
}

const storeFlowSlugs = new Set(["/shop", "/product", "/cart", "/checkout", "/account", "/wishlist", "/order-success", "/track-order"]);
const systemSlugs = new Set(["/admin", "/auth", "/bkash", "/cms-admin"]);

function getPageGroup(p: StorePage): "content" | "store-flow" | "system" {
  if (systemSlugs.has(p.slug) || p.slug.startsWith("/admin") || p.slug.startsWith("/auth")) {
    return "system";
  }
  if (storeFlowSlugs.has(p.slug) || p.slug.startsWith("/product")) {
    return "store-flow";
  }
  return "content";
}

export function BasicPagesTab({ page, allPages, selectPage, onCreatePage }: BasicPagesTabProps) {
  const contentPages = allPages.filter((p) => getPageGroup(p) === "content");
  const storeFlowPages = allPages.filter((p) => getPageGroup(p) === "store-flow");
  const systemPages = allPages.filter((p) => getPageGroup(p) === "system");

  return (
    <div data-testid="basic-tab-pages" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Store Pages</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Select a page to edit layout and blocks</p>
        </div>
        {onCreatePage ? (
          <Button type="button" size="sm" onClick={onCreatePage} className="h-8 gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" />
            New Page
          </Button>
        ) : null}
      </div>

      <div className="space-y-4">
        {/* Content Pages */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <FileText className="h-3.5 w-3.5 text-emerald-600" />
            <span>Standard Pages ({contentPages.length})</span>
          </div>
          <div className="space-y-1.5">
            {contentPages.map((p) => {
              const isSelected = page?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPage(p.id)}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{p.title}</span>
                      {p.isHomepage ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Home</Badge>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">{p.slug}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? "text-emerald-600 dark:text-emerald-400 translate-x-0.5" : "text-gray-400"}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Store Flow Pages */}
        {storeFlowPages.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />
              <span>Store Flow Pages ({storeFlowPages.length})</span>
            </div>
            <div className="space-y-1.5">
              {storeFlowPages.map((p) => {
                const isSelected = page?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPage(p.id)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{p.title}</span>
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">{p.slug}</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? "text-emerald-600 dark:text-emerald-400 translate-x-0.5" : "text-gray-400"}`} />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* System Pages */}
        {systemPages.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
              <span>System Pages ({systemPages.length})</span>
            </div>
            <div className="space-y-1.5">
              {systemPages.map((p) => {
                const isSelected = page?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPage(p.id)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{p.title}</span>
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">{p.slug}</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? "text-emerald-600 dark:text-emerald-400 translate-x-0.5" : "text-gray-400"}`} />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
