"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BasicEffectsTabProps {
  effects?: {
    scrollReveals?: boolean;
    hoverEffects?: boolean;
    parallax?: boolean;
    intensity?: "subtle" | "medium" | "bold";
  };
  onUpdateEffect: (
    key: "scrollReveals" | "hoverEffects" | "parallax" | "intensity",
    value: boolean | "subtle" | "medium" | "bold",
  ) => void;
}

export function BasicEffectsTab({ effects, onUpdateEffect }: BasicEffectsTabProps) {
  const scrollReveals = effects?.scrollReveals ?? false;
  const hoverEffects = effects?.hoverEffects ?? true;
  const parallax = effects?.parallax ?? false;
  const intensity = effects?.intensity ?? "medium";

  return (
    <div data-testid="basic-tab-effects" className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Visual Effects & Motion</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">Configure corner rounding, micro-animations, and surface effects</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Interactive Polish</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Scroll Animations</span>
                <p className="text-[11px] text-gray-500">Smooth scroll reveal effects for page sections</p>
              </div>
              <Switch
                checked={scrollReveals}
                onCheckedChange={(checked) => onUpdateEffect("scrollReveals", checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Hover Effects</span>
                <p className="text-[11px] text-gray-500">Use the storefront's established hover treatments</p>
              </div>
              <Switch
                checked={hoverEffects}
                onCheckedChange={(checked) => onUpdateEffect("hoverEffects", checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Parallax</span>
                <p className="text-[11px] text-gray-500">Add depth to supported storefront sections</p>
              </div>
              <Switch
                checked={parallax}
                onCheckedChange={(checked) => onUpdateEffect("parallax", checked)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Effect Intensity</Label>
          <Select value={intensity} onValueChange={(value) => onUpdateEffect("intensity", value as "subtle" | "medium" | "bold")}>
            <SelectTrigger className="h-10 border-gray-200 bg-white text-xs dark:border-gray-800 dark:bg-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subtle">Subtle</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
