"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type PreviewViewport = "desktop" | "tablet" | "mobile";

const viewportConfig: Record<PreviewViewport, { width: number; height: number; frameClassName: string }> = {
  desktop: {
    width: 1280,
    height: 900,
    frameClassName: "rounded-[20px]",
  },
  tablet: {
    width: 834,
    height: 1112,
    frameClassName: "rounded-[28px]",
  },
  mobile: {
    width: 390,
    height: 844,
    frameClassName: "rounded-[32px]",
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
      overflow-x: hidden;
    }

    body {
      font-family: inherit;
    }

    #storefront-preview-root {
      min-height: 100vh;
    }
  `;
  targetDocument.head.appendChild(baseStyle);

  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    targetDocument.head.appendChild(node.cloneNode(true));
  });
}

export function StorefrontPreviewFrame({
  viewport,
  children,
  className,
  title = "Storefront preview",
}: {
  viewport: PreviewViewport;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const config = viewportConfig[viewport];

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const targetDocument = iframe.contentDocument;
    if (!targetDocument) return;

    targetDocument.open();
    targetDocument.write("<!doctype html><html><head></head><body><div id=\"storefront-preview-root\"></div></body></html>");
    targetDocument.close();

    clonePreviewStyles(targetDocument);
    setMountNode(targetDocument.getElementById("storefront-preview-root") as HTMLDivElement | null);
  }, [viewport]);

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

  const scaledHeight = useMemo(() => Math.max(320, Math.round(config.height * scale)), [config.height, scale]);

  return (
    <div ref={shellRef} className={cn("w-full", className)}>
      <div
        className={cn("mx-auto overflow-hidden border border-border/80 bg-background shadow-xl", config.frameClassName)}
        style={{ width: config.width * scale, height: scaledHeight }}
      >
        <div
          style={{
            width: config.width,
            height: config.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <iframe
            ref={iframeRef}
            title={title}
            className="h-full w-full border-0 bg-background"
            style={{ width: config.width, height: config.height }}
          />
          {mountNode ? createPortal(children, mountNode) : null}
        </div>
      </div>
    </div>
  );
}
