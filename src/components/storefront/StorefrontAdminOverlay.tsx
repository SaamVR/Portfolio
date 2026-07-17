"use client";

import { ExternalLink, Eye, EyeOff, FilePenLine, SquarePen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "@/lib/react-router-dom-shim";
import { buildPageBuilderPath } from "@/lib/admin-paths";

type StorefrontAdminOverlayProps = {
  pageId: string;
  pageTitle: string;
  adminMode: boolean;
  onAdminModeChange: (enabled: boolean) => void;
};

export function StorefrontAdminOverlay({
  pageId,
  pageTitle,
  adminMode,
  onAdminModeChange,
}: StorefrontAdminOverlayProps) {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  const basicEditorHref = buildPageBuilderPath("basic", { pageId, returnTo });
  const advancedEditorHref = buildPageBuilderPath("advanced", { pageId, returnTo });

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col gap-2">
      {adminMode ? (
        <div className="pointer-events-auto rounded-lg border border-primary/30 bg-background/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Page Builder Mode</p>
              <p className="truncate text-sm font-semibold text-foreground">{pageTitle}</p>
            </div>
            <Badge variant="secondary">Live</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => onAdminModeChange(false)}>
              <EyeOff className="h-4 w-4" />
              Hide Overlay
            </Button>
            <Button asChild type="button" size="sm" variant="outline">
              <Link to={basicEditorHref}>
                <FilePenLine className="h-4 w-4" />
                Basic Editing
              </Link>
            </Button>
            <Button asChild type="button" size="sm" variant="outline">
              <Link to={advancedEditorHref}>Advanced Editing</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto flex justify-end">
        <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
          <Button type="button" size="icon" variant={adminMode ? "secondary" : "ghost"} onClick={() => onAdminModeChange(!adminMode)}>
            {adminMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button asChild type="button" size="icon" variant="ghost">
            <Link to={basicEditorHref} aria-label="Edit page in basic editing workspace">
              <SquarePen className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild type="button" size="icon" variant="ghost">
            <Link to={advancedEditorHref} aria-label="Open advanced editing workspace">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
