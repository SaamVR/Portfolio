"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PropertyRow, type PropertyRowProps } from "./PropertyRow";

export interface TextFieldProps extends Omit<PropertyRowProps, "children"> {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}

export function TextField({
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  ...rowProps
}: TextFieldProps) {
  return (
    <PropertyRow {...rowProps}>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        />
      ) : (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
        />
      )}
    </PropertyRow>
  );
}
