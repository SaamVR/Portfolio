"use client";

import React from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PropertyRowProps {
  label: string;
  help?: string;
  inheritedValue?: string;
  isOverridden?: boolean;
  onReset?: () => void;
  warning?: string;
  className?: string;
  children: React.ReactNode;
}

export function PropertyRow({
  label,
  help,
  inheritedValue,
  isOverridden = false,
  onReset,
  warning,
  className,
  children,
}: PropertyRowProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <label className={cn(
            "text-xs font-medium text-gray-900 dark:text-gray-100 truncate",
            isOverridden && "border-l-2 border-amber-500 pl-1.5 font-semibold text-amber-900 dark:text-amber-200"
          )}>
            {label}
          </label>
          {isOverridden ? (
            <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Override
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {inheritedValue && !isOverridden ? (
            <span className="text-[11px] text-gray-500 dark:text-gray-500 font-mono truncate max-w-[120px]">
              {inheritedValue}
            </span>
          ) : null}

          {isOverridden && onReset ? (
            <button
              type="button"
              onClick={onReset}
              title="Reset override"
              className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      {children}

      {help ? (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">{help}</p>
      ) : null}

      {warning ? (
        <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>{warning}</span>
        </div>
      ) : null}
    </div>
  );
}
