"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Monitor, Tablet, Smartphone, Lock, RotateCw } from "lucide-react";

export type PreviewViewport = "desktop" | "tablet" | "mobile";

const viewportConfig: Record<PreviewViewport, { width: number; height: number; frameClassName: string }> = {
  desktop: {
    width: 1280,
    height: 850,
    frameClassName: "rounded-xl border border-border/80 shadow-2xl bg-background",
  },
  tablet: {
    width: 834,
    height: 1050,
    frameClassName: "rounded-[24px] border-[8px] border-slate-900 dark:border-slate-800 shadow-2xl bg-background",
  },
  mobile: {
    width: 390,
    height: 844,
    frameClassName: "rounded-[36px] border-[10px] border-slate-900 dark:border-slate-800 shadow-2xl bg-background",
  },
};

function clonePreviewStyles(targetDocument: Document) {
  targetDocument.head.innerHTML = "";

  const baseStyle = targetDocument.createElement("style");
  baseStyle.textContent = `
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: hsl(var(--background, 0 0% 100%));
      color: hsl(var(--foreground, 0 0% 15%));
      overflow-x: hidden;
    }

    body {
      font-family: inherit;
      -webkit-font-smoothing: antialiased;
    }

    #storefront-preview-root {
      min-height: 100vh;
    }

    /* Prevent scrollbars inside scaling iframe */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(150, 150, 150, 0.3);
      border-radius: 3px;
    }
  `;
  targetDocument.head.appendChild(baseStyle);

  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    targetDocument.head.appendChild(node.cloneNode(true));
  });
}

export function StorefrontPreviewFrame({
  viewport: controlledViewport,
  onViewportChange,
  showToolbar = true,
  children,
  className,
  title = "Storefront preview",
  isolateNavigation = true,
}: {
  viewport?: PreviewViewport;
  onViewportChange?: (viewport: PreviewViewport) => void;
  showToolbar?: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
  isolateNavigation?: boolean;
}) {
  const [internalViewport, setInternalViewport] = useState<PreviewViewport>("desktop");
  const activeViewport = controlledViewport ?? internalViewport;

  const handleViewportChange = (v: PreviewViewport) => {
    setInternalViewport(v);
    onViewportChange?.(v);
  };

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const config = viewportConfig[activeViewport];

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const targetDocument = iframe.contentDocument;
    if (!targetDocument) return;

    targetDocument.open();
    targetDocument.write("<!doctype html><html><head></head><body><div id=\"storefront-preview-root\"></div></body></html>");
    targetDocument.close();

    const handleNativeClick = (e: MouseEvent) => {
      if (!isolateNavigation) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("a, button, [role='button'], input[type='submit'], form")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (isolateNavigation) {
      targetDocument.addEventListener("click", handleNativeClick, true);
    }

    clonePreviewStyles(targetDocument);
    setMountNode(targetDocument.getElementById("storefront-preview-root") as HTMLDivElement | null);

    return () => {
      if (isolateNavigation) {
        targetDocument.removeEventListener("click", handleNativeClick, true);
      }
    };
  }, [activeViewport, isolateNavigation]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const updateScale = () => {
      const availableWidth = shell.clientWidth;
      setScale(Math.min(1, availableWidth / config.width));
    };

    updateScale();

    const observer = new ResizeObserver(() => updateScale());
    observer.observe(shell);
    return () => observer.disconnect();
  }, [config.width]);

  const scaledHeight = useMemo(() => Math.max(300, Math.round(config.height * scale)), [config.height, scale]);

  const handleInterceptClick = (e: React.MouseEvent) => {
    if (!isolateNavigation) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("a, button, [role='button'], input[type='submit'], form")) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleInterceptSubmit = (e: React.FormEvent) => {
    if (!isolateNavigation) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRefresh = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Sleek Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/60 backdrop-blur-sm p-1.5 shadow-sm">
          {/* Viewport Toggles */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={activeViewport === "desktop" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium rounded-lg"
              onClick={() => handleViewportChange("desktop")}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </Button>
            <Button
              type="button"
              variant={activeViewport === "tablet" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium rounded-lg"
              onClick={() => handleViewportChange("tablet")}
            >
              <Tablet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </Button>
            <Button
              type="button"
              variant={activeViewport === "mobile" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium rounded-lg"
              onClick={() => handleViewportChange("mobile")}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </Button>
          </div>

          {/* URL Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/60 border border-border/50 text-[11px] text-muted-foreground font-mono">
            <Lock className="h-3 w-3 text-emerald-500" />
            <span>https://store.ezcomo.shop</span>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleRefresh}
              title="Reset View"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Frame Container */}
      <div ref={shellRef} className="w-full">
        <div
          className={cn("mx-auto overflow-hidden transition-all duration-300", config.frameClassName)}
          style={{ width: config.width * scale, height: scaledHeight }}
        >
          {/* Desktop Chrome Bar */}
          {activeViewport === "desktop" && (
            <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="mx-auto flex items-center gap-1.5 rounded-md border bg-background/90 px-3 py-0.5 text-[11px] text-muted-foreground font-mono">
                <Lock className="h-3 w-3 text-emerald-500" />
                <span>store.ezcomo.shop</span>
              </div>
            </div>
          )}

          <div
            style={{
              width: config.width,
              height: config.height - (activeViewport === "desktop" ? 32 : 0),
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <iframe
              ref={iframeRef}
              title={title}
              className="h-full w-full border-0 bg-background"
              style={{
                width: config.width,
                height: config.height - (activeViewport === "desktop" ? 32 : 0),
              }}
            />
            {mountNode ? createPortal(
              <div
                className="w-full h-full"
                onClickCapture={handleInterceptClick}
                onSubmitCapture={handleInterceptSubmit}
              >
                {children}
              </div>,
              mountNode
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
