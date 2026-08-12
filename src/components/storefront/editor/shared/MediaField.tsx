"use client";

import React from "react";
import { Image as ImageIcon, Upload, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PropertyRow, type PropertyRowProps } from "./PropertyRow";
import CloudinaryUpload from "@/components/admin/CloudinaryUpload";

export interface MediaFieldProps extends Omit<PropertyRowProps, "children"> {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  aspectRatio?: "square" | "video" | "banner";
  storeId?: string;
  folder?: string;
  accept?: string;
  resourceType?: "image" | "video" | "auto";
}

export function MediaField({
  value,
  onChange,
  placeholder = "https://...",
  aspectRatio = "square",
  storeId,
  folder,
  accept,
  resourceType,
  ...rowProps
}: MediaFieldProps) {
  const aspectClass =
    aspectRatio === "video" ? "aspect-video" : aspectRatio === "banner" ? "aspect-[3/1]" : "aspect-square";

  return (
    <PropertyRow {...rowProps}>
      <div className="space-y-2">
        {value ? (
          <div className={`relative ${aspectClass} w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 group`}>
            <img src={value} alt="Preview" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={() => onChange("")}
                title="Remove image"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 text-center">
            <ImageIcon className="h-6 w-6 text-gray-400" />
            <p className="text-[11px] text-gray-500">Upload or enter image URL</p>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-9 text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex-1"
          />
          <CloudinaryUpload
            value={value}
            onChange={onChange}
            showPreview={false}
            storeId={storeId}
            folder={folder}
            accept={accept}
            resourceType={resourceType}
          />
        </div>
      </div>
    </PropertyRow>
  );
}
