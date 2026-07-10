"use client";

import { useState } from "react";
import { Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MediaLibraryBrowser } from "@/components/admin/MediaLibraryBrowser";
import { useAuth } from "@/hooks/auth-context";
import type { MediaLibraryAsset } from "@/lib/media-library";
import { toast } from "sonner";

type MediaLibraryPickerProps = {
  value?: string;
  storeId?: string;
  folder?: string;
  resourceType?: "image" | "video" | "auto";
  onSelect: (asset: MediaLibraryAsset) => void;
};

export function MediaLibraryPicker({
  value,
  storeId,
  folder = "cms",
  resourceType = "auto",
  onSelect,
}: MediaLibraryPickerProps) {
  const { activeStoreId } = useAuth();
  const effectiveStoreId = storeId || activeStoreId || undefined;
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Open media library"
          disabled={!effectiveStoreId}
          onClick={() => {
            if (!effectiveStoreId) {
              toast.error("Select a store before opening the media library.");
            }
          }}
        >
          <Images className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-6xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Choose Media</DialogTitle>
          <DialogDescription>Pick an existing asset or upload a new one without leaving your current editor.</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto pr-1">
          <MediaLibraryBrowser
            storeId={effectiveStoreId}
            folder={folder}
            resourceType={resourceType}
            selectedUrl={value}
            onSelect={(asset) => {
              onSelect(asset);
              setOpen(false);
            }}
            showSelectionActions
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

