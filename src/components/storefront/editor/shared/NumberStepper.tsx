"use client";

import React from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PropertyRow, type PropertyRowProps } from "./PropertyRow";

export interface NumberStepperProps extends Omit<PropertyRowProps, "children"> {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  ...rowProps
}: NumberStepperProps) {
  const handleDecrement = () => {
    const next = value - step;
    if (min !== undefined && next < min) return;
    onChange(next);
  };

  const handleIncrement = () => {
    const next = value + step;
    if (max !== undefined && next > max) return;
    onChange(next);
  };

  return (
    <PropertyRow {...rowProps}>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 border-gray-200 dark:border-gray-800"
          onClick={handleDecrement}
          disabled={min !== undefined && value <= min}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <div className="relative flex-1">
          <Input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-9 text-center text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          />
          {unit ? (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
              {unit}
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 border-gray-200 dark:border-gray-800"
          onClick={handleIncrement}
          disabled={max !== undefined && value >= max}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </PropertyRow>
  );
}
