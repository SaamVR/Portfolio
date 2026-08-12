"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { PropertyRow, type PropertyRowProps } from "./PropertyRow";

export interface ColorFieldProps extends Omit<PropertyRowProps, "children"> {
  value: string;
  onChange: (hex: string) => void;
  presetSwatches?: string[];
}

export function ColorField({
  value,
  onChange,
  presetSwatches,
  ...rowProps
}: ColorFieldProps) {
  return (
    <PropertyRow {...rowProps}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <input
              type="color"
              value={value.startsWith("#") ? value : "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="h-9 w-9 rounded-md border border-gray-200 dark:border-gray-800 bg-transparent p-0.5 cursor-pointer"
            />
          </div>
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="h-9 font-mono text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 uppercase"
          />
        </div>

        {presetSwatches && presetSwatches.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {presetSwatches.map((swatch, idx) => (
              <button
                key={`${swatch}-${idx}`}
                type="button"
                onClick={() => onChange(swatch)}
                style={{ backgroundColor: swatch }}
                title={swatch}
                className="h-6 w-6 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            ))}
          </div>
        ) : null}
      </div>
    </PropertyRow>
  );
}
