"use client";

import React from "react";
import { Link2, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PropertyRow, type PropertyRowProps } from "./PropertyRow";
import type { StorePage } from "@/lib/cms/schema";

export interface LinkPickerProps extends Omit<PropertyRowProps, "children"> {
  value: string;
  onChange: (url: string) => void;
  allPages?: StorePage[];
  allowExternal?: boolean;
}

export function LinkPicker({
  value,
  onChange,
  allPages = [],
  allowExternal = true,
  ...rowProps
}: LinkPickerProps) {
  const isCustomUrl = value && !allPages.some((p) => p.slug === value);

  return (
    <PropertyRow {...rowProps}>
      <div className="space-y-2">
        <Select value={isCustomUrl ? "__custom__" : value} onValueChange={(val) => {
          if (val !== "__custom__") onChange(val);
        }}>
          <SelectTrigger className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <SelectValue placeholder="Select internal page..." />
          </SelectTrigger>
          <SelectContent>
            {allPages.map((page) => (
              <SelectItem key={page.id} value={page.slug} className="text-xs">
                <div className="flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-gray-400" />
                  <span>{page.title}</span>
                  <span className="text-[10px] text-gray-400 font-mono">({page.slug})</span>
                </div>
              </SelectItem>
            ))}
            {allowExternal ? (
              <SelectItem value="__custom__" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Custom / External URL...</span>
                </div>
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>

        {isCustomUrl || (!value && allowExternal) ? (
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com or /custom-path"
            className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          />
        ) : null}
      </div>
    </PropertyRow>
  );
}
