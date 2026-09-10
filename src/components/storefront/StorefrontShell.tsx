"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Layout from "@/components/Layout";
import type { StorefrontTemplateDefinition, StorefrontTemplateId } from "@/lib/cms/storefront-templates";
import { cn } from "@/lib/utils";
import styles from "./StorefrontShell.module.css";

function buildTemplateShellStyle(template: StorefrontTemplateDefinition): CSSProperties {
  return {
    ["--storefront-template-radius" as string]: template.presentation.borderRadius,
    ["--storefront-template-density" as string]: template.presentation.spacingDensity,
    ["--storefront-template-card-style" as string]: template.presentation.cardStyle,
    ["--storefront-template-image-ratio" as string]: template.presentation.imageRatio,
    ["--storefront-template-type-scale" as string]: template.presentation.typographyScale,
    ...template.presentation.colorTokens,
  };
}

export function StorefrontShell({
  children,
  templateId,
  template,
  embedded = false,
}: {
  children: ReactNode;
  templateId: StorefrontTemplateId;
  template: StorefrontTemplateDefinition;
  embedded?: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = contentRef.current;
    if (!root || typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyReducedMotion = () => {
      if (!reducedMotion.matches) return;

      root.querySelectorAll<HTMLVideoElement>("video[autoplay]").forEach((video) => {
        video.pause();
        video.autoplay = false;
        video.loop = false;
        video.controls = true;
        video.removeAttribute("autoplay");
        video.removeAttribute("loop");
        video.dataset.reducedMotionPaused = "true";
      });

      root.querySelectorAll<HTMLIFrameElement>('iframe[src*="youtube.com/embed"], iframe[src*="player.vimeo.com"]').forEach((frame) => {
        const rawSrc = frame.getAttribute("src");
        if (!rawSrc || frame.dataset.reducedMotionAutoplayDisabled === "true") return;
        try {
          const url = new URL(rawSrc, window.location.origin);
          url.searchParams.set("autoplay", "0");
          frame.src = url.toString();
          const allow = frame.getAttribute("allow");
          if (allow) {
            frame.setAttribute(
              "allow",
              allow
                .split(";")
                .map((value) => value.trim())
                .filter((value) => value && value !== "autoplay")
                .join("; "),
            );
          }
          frame.dataset.reducedMotionAutoplayDisabled = "true";
        } catch {
          // Leave malformed merchant embed URLs untouched rather than breaking the frame.
        }
      });
    };

    applyReducedMotion();
    const observer = typeof MutationObserver === "undefined" ? null : new MutationObserver(applyReducedMotion);
    observer?.observe(root, { childList: true, subtree: true });
    reducedMotion.addEventListener?.("change", applyReducedMotion);

    return () => {
      observer?.disconnect();
      reducedMotion.removeEventListener?.("change", applyReducedMotion);
    };
  }, []);

  const content = (
    <div
      ref={contentRef}
      data-storefront-template={templateId}
      data-storefront-card-style={template.presentation.cardStyle}
      data-storefront-density={template.presentation.spacingDensity}
      data-storefront-image-ratio={template.presentation.imageRatio}
      data-storefront-typography-scale={template.presentation.typographyScale}
      data-storefront-embedded-preview={embedded ? "true" : "false"}
      className={cn(styles.root, embedded && "isolate overflow-hidden bg-background")}
      style={buildTemplateShellStyle(template)}
    >
      {children}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <Layout className={styles.root}>{content}</Layout>;
}
