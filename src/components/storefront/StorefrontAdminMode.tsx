"use client";

import { LayoutTemplate } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import type { StorePageBlock } from "@/lib/cms/schema";

type StorefrontAdminModeProps = {
  pageId: string;
  block: StorePageBlock;
  index: number;
};

export function StorefrontAdminMode({ pageId, block, index }: StorefrontAdminModeProps) {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  const blockEditorHref = `/admin/cms?page=${encodeURIComponent(pageId)}&block=${encodeURIComponent(block.id)}&returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-40 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-background/95 px-3 py-1.5 shadow-sm backdrop-blur">
        <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">{block.type}</span>
        <Badge variant="outline">#{index + 1}</Badge>
      </div>
      <Button asChild type="button" size="sm" variant="secondary" className="pointer-events-auto h-8 rounded-full px-3 shadow-sm">
        <Link to={blockEditorHref}>Edit Block</Link>
      </Button>
    </div>
  );
}
