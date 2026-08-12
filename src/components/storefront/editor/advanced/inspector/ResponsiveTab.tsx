"use client";

import React from "react";
import { Monitor, Tablet, Smartphone, Info } from "lucide-react";
import { PropertyRow } from "@/components/storefront/editor/shared/PropertyRow";
import { Switch } from "@/components/ui/switch";
import type { StorePageBlock } from "@/lib/cms/schema";

export interface ResponsiveTabProps {
  selectedBlock: StorePageBlock | null;
  viewport: "desktop" | "tablet" | "mobile";
  onViewportChange: (vp: "desktop" | "tablet" | "mobile") => void;
  updateSelectedBlockProps: (props: Record<string, unknown>) => void;
}

export function ResponsiveTab({
  selectedBlock,
  viewport,
  onViewportChange,
  updateSelectedBlockProps,
}: ResponsiveTabProps) {
  if (!selectedBlock) {
    return (
      <div className="p-4 text-center text-xs text-gray-500">
        Select a block to configure viewport responsiveness.
      </div>
    );
  }

  const propsObj = (selectedBlock.props || {}) as Record<string, unknown>;
  const hideOnMobile = Boolean(propsObj.hideOnMobile);
  const hideOnTablet = Boolean(propsObj.hideOnTablet);
  const hideOnDesktop = Boolean(propsObj.hideOnDesktop);

  return (
    <div data-testid="advanced-inspector-tab-responsive" className="p-4 space-y-6">
      <div>
        <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
          Viewport Edit Scope
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Select target device breakpoint to apply device-specific style overrides.
        </p>
      </div>

      {/* Breakpoint Switcher */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: "desktop", label: "Desktop", icon: Monitor },
          { id: "tablet", label: "Tablet", icon: Tablet },
          { id: "mobile", label: "Mobile", icon: Smartphone },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = viewport === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewportChange(item.id as "desktop" | "tablet" | "mobile")}
              className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                isActive
                  ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Icon className="h-5 w-5 mb-1 text-current" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      {viewport !== "desktop" ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Editing <strong>{viewport}</strong> breakpoint overrides only. Blank fields fall back to desktop.</span>
        </div>
      ) : null}

      {/* Visibility Toggles */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
          Device Visibility Rules
        </h4>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Hide on Mobile</span>
            <Switch
              checked={hideOnMobile}
              onCheckedChange={(checked) => updateSelectedBlockProps({ hideOnMobile: checked })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Hide on Tablet</span>
            <Switch
              checked={hideOnTablet}
              onCheckedChange={(checked) => updateSelectedBlockProps({ hideOnTablet: checked })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Hide on Desktop</span>
            <Switch
              checked={hideOnDesktop}
              onCheckedChange={(checked) => updateSelectedBlockProps({ hideOnDesktop: checked })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
