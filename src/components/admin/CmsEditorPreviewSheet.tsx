"use client";

import type { ReactNode } from "react";
import { Monitor, PanelsTopLeft, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CmsEditorPreviewViewport } from "@/lib/cms/editor-presentation-controller";

export function CmsEditorPreviewSheet({
  open,
  onOpenChange,
  viewport,
  onViewportChange,
  pageTitle,
  previewCanvas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewport: CmsEditorPreviewViewport;
  onViewportChange: (viewport: CmsEditorPreviewViewport) => void;
  pageTitle: string;
  previewCanvas: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-0 h-[100dvh] max-h-[100dvh] w-screen overflow-y-auto border-0 p-0 duration-0 data-[state=open]:duration-0 data-[state=open]:slide-in-from-bottom-0"
        data-testid="basic-preview-overlay"
      >
        <SheetHeader className="sticky top-0 z-20 border-b border-border bg-background/95 px-3 py-3 text-left backdrop-blur-xl sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle>Full Screen Preview</SheetTitle>
              <SheetDescription className="truncate">
                {pageTitle} rendered with current Basic Mode draft.
              </SheetDescription>
            </div>
            <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button type="button" size="sm" className="gap-1.5 px-2" variant={viewport === "desktop" ? "secondary" : "outline"} onClick={() => onViewportChange("desktop")} data-testid="basic-preview-device-desktop" data-active={viewport === "desktop"}>
              <Monitor className="h-4 w-4" />
              <span className="text-xs">Desktop</span>
            </Button>
            <Button type="button" size="sm" className="gap-1.5 px-2" variant={viewport === "tablet" ? "secondary" : "outline"} onClick={() => onViewportChange("tablet")} data-testid="basic-preview-device-tablet" data-active={viewport === "tablet"}>
              <PanelsTopLeft className="h-4 w-4" />
              <span className="text-xs">Tablet</span>
            </Button>
            <Button type="button" size="sm" className="gap-1.5 px-2" variant={viewport === "mobile" ? "secondary" : "outline"} onClick={() => onViewportChange("mobile")} data-testid="basic-preview-device-mobile" data-active={viewport === "mobile"}>
              <Smartphone className="h-4 w-4" />
              <span className="text-xs">Mobile</span>
            </Button>
          </div>
        </SheetHeader>
        <div className="p-3 sm:p-4">{previewCanvas}</div>
      </SheetContent>
    </Sheet>
  );
}
