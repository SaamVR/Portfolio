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

    /* EZComo Preview Selection Outlines */
    .ezcomo-selected-outline {
      outline: 2px solid #10b981 !important;
      outline-offset: -2px !important;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.25) !important;
      position: relative !important;
      z-index: 20 !important;
    }

    .ezcomo-hovered-outline {
      outline: 2px dashed #9ca3af !important;
      outline-offset: -2px !important;
    }
  `;
  targetDocument.head.appendChild(baseStyle);

  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    targetDocument.head.appendChild(node.cloneNode(true));
  });
}

function resolveAnchorHref(targetDocument: Document, anchor: HTMLAnchorElement) {
  const rawHref = anchor.getAttribute("href");
  if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) {
    return null;
  }

  try {
    return new URL(rawHref, window.location.origin).toString();
  } catch {
    try {
      return new URL(rawHref, targetDocument.baseURI || window.location.href).toString();
    } catch {
      return null;
    }
  }
}

export function StorefrontPreviewFrame({
  viewport: controlledViewport,
  onViewportChange,
  showToolbar = true,
  children,
  className,
  title = "Storefront preview",
  isolateNavigation = true,
  selectedBlockId,
  onSelectBlock,
  onHoverBlock,
  onPatchDraft,
}: {
  viewport?: PreviewViewport;
  onViewportChange?: (viewport: PreviewViewport) => void;
  showToolbar?: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
  isolateNavigation?: boolean;
  selectedBlockId?: string | null;
  onSelectBlock?: (blockId: string | null) => void;
  onHoverBlock?: (blockId: string | null) => void;
  onPatchDraft?: (patch: Record<string, unknown>) => void;
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
  const patchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mount iframe document & set up event listeners
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const targetDocument = iframe.contentDocument;
    if (!targetDocument) return;

    targetDocument.open();
    targetDocument.write('<!doctype html><html><head></head><body><div id="storefront-preview-root"></div></body></html>');
    targetDocument.close();

    clonePreviewStyles(targetDocument);
    setMountNode(targetDocument.getElementById("storefront-preview-root") as HTMLDivElement | null);
  }, [activeViewport]);

  // Click-to-Select & Hover Event Delegation inside Iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    const targetDocument = iframe?.contentDocument;
    if (!targetDocument) return;

    const handleNativeClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const blockEl = target.closest("[data-ezcomo-block-id]") as HTMLElement | null;
      if (blockEl) {
        const blockId = blockEl.getAttribute("data-ezcomo-block-id");
        if (blockId) {
          if (isolateNavigation) {
            const isInteractive = target.closest("a, button, [role='button'], input[type='submit'], form");
            if (isInteractive) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
          onSelectBlock?.(blockId);

          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ kind: "ezcomo:block-clicked", blockId }, window.location.origin);
          }
        }
      } else if (isolateNavigation) {
        const isInteractive = target.closest("a, button, [role='button'], input[type='submit'], form");
        if (isInteractive) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const blockEl = target.closest("[data-ezcomo-block-id]") as HTMLElement | null;
      const blockId = blockEl?.getAttribute("data-ezcomo-block-id") ?? null;

      // Update hover outline class
      targetDocument.querySelectorAll(".ezcomo-hovered-outline").forEach((el) => {
        if (el !== blockEl) el.classList.remove("ezcomo-hovered-outline");
      });

      if (blockEl && !blockEl.classList.contains("ezcomo-selected-outline")) {
        blockEl.classList.add("ezcomo-hovered-outline");
      }

      onHoverBlock?.(blockId);
    };

    const handleMouseLeave = () => {
      targetDocument.querySelectorAll(".ezcomo-hovered-outline").forEach((el) => {
        el.classList.remove("ezcomo-hovered-outline");
      });
      onHoverBlock?.(null);
    };

    targetDocument.addEventListener("click", handleNativeClick, true);
    targetDocument.addEventListener("mousemove", handleMouseMove, true);
    targetDocument.addEventListener("mouseleave", handleMouseLeave, true);

    return () => {
      targetDocument.removeEventListener("click", handleNativeClick, true);
      targetDocument.removeEventListener("mousemove", handleMouseMove, true);
      targetDocument.removeEventListener("mouseleave", handleMouseLeave, true);
    };
  }, [mountNode, isolateNavigation, onSelectBlock, onHoverBlock]);

  // Sync Outlines & Scroll-to on selectedBlockId change
  useEffect(() => {
    const iframe = iframeRef.current;
    const targetDocument = iframe?.contentDocument;
    if (!targetDocument) return;

    // Clear old selected outlines
    targetDocument.querySelectorAll(".ezcomo-selected-outline").forEach((el) => {
      el.classList.remove("ezcomo-selected-outline");
    });

    if (!selectedBlockId) return;

    const selectedEl = targetDocument.querySelector(`[data-ezcomo-block-id="${selectedBlockId}"]`) as HTMLElement | null;
    if (selectedEl) {
      selectedEl.classList.remove("ezcomo-hovered-outline");
      selectedEl.classList.add("ezcomo-selected-outline");
      selectedEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedBlockId, mountNode]);

  // PostMessage protocol listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const data = event.data;
      if (!data || typeof data !== "object" || !data.kind) return;

      switch (data.kind) {
        case "ezcomo:select":
          if (typeof data.blockId === "string" || data.blockId === null) {
            onSelectBlock?.(data.blockId);
          }
          break;

        case "ezcomo:scroll-to":
          if (data.blockId && iframeRef.current?.contentDocument) {
            const targetEl = iframeRef.current.contentDocument.querySelector(`[data-ezcomo-block-id="${data.blockId}"]`);
            targetEl?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          break;

        case "ezcomo:patch":
          if (data.store && onPatchDraft) {
            if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
            patchTimerRef.current = setTimeout(() => {
              onPatchDraft(data.store);
            }, 200); // 200ms throttle
          }
          break;

        case "ezcomo:block-clicked":
          if (data.blockId) {
            onSelectBlock?.(data.blockId);
          }
          break;

        case "ezcomo:block-hovered":
          onHoverBlock?.(data.blockId ?? null);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    };
  }, [onSelectBlock, onHoverBlock, onPatchDraft]);

  // Scale computation
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
              <div className="w-full h-full">
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
