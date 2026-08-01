"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EditorPageOption } from "./types";

export function EditorPageSelector({
  pages,
  value,
  onChange,
}: {
  pages: EditorPageOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 min-w-[180px] border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <SelectValue placeholder="Select a page" />
      </SelectTrigger>
      <SelectContent>
        {pages.map((page) => (
          <SelectItem key={page.id} value={page.id}>
            {page.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
