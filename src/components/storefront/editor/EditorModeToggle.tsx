"use client";

import { cn } from "@/lib/utils";
import type { EditorMode } from "./types";

export function EditorModeToggle({
  mode,
  onChange,
  canUseAdvanced = true,
}: {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
  canUseAdvanced?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Editor mode"
      className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      {(["basic", "advanced"] as const).map((value) => {
        const disabled = value === "advanced" && !canUseAdvanced;

        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            aria-disabled={disabled}
            disabled={disabled}
            title={disabled ? "Advanced Mode is not included in this store plan" : undefined}
            onClick={() => onChange(value)}
            className={cn(
              "min-h-11 px-3 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50",
              mode === value
                ? "bg-emerald-600 text-white dark:bg-emerald-500"
                : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800",
            )}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
