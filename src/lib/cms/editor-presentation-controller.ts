"use client";

import { useEffect, useMemo, useState } from "react";

export type CmsEditorWorkspaceTab = "store" | "theme" | "pages" | "info" | "gallery";
export type CmsEditorPreviewViewport = "desktop" | "tablet" | "mobile";
export type CmsEditorDesktopPreviewMode = "side" | "below" | "minimized" | "hidden";
export type CmsEditorDesktopPreviewSide = "left" | "right";
export type CmsEditorBuilderMode = "manager" | "basic" | "advanced";
export type CmsEditorRenderBranch = "gallery" | "basic-recovery" | "editor-shell" | "guided-editor" | "legacy";
export type CmsEditorBasicGuideStep = "basics" | "homepage" | "product" | "checkout" | "custom" | "launch";
export type CmsEditorAdvancedCodePanel = "page-json" | "block-json" | "theme-css" | "layout";

export function resolveCmsEditorBuilderMode(pathname: string): CmsEditorBuilderMode {
  if (pathname.includes("/advanced")) return "advanced";
  if (pathname.includes("/basic")) return "basic";
  return "manager";
}

export function resolveCmsEditorRenderBranch({
  workspaceTab,
  isBasicEditor,
  isAdvancedEditor,
  useLegacyEditor,
  hasSelectedPage,
}: {
  workspaceTab: CmsEditorWorkspaceTab;
  isBasicEditor: boolean;
  isAdvancedEditor: boolean;
  useLegacyEditor: boolean;
  hasSelectedPage: boolean;
}): CmsEditorRenderBranch {
  if (workspaceTab === "gallery") return "gallery";
  if (isBasicEditor && !hasSelectedPage) return "basic-recovery";
  if ((isBasicEditor || isAdvancedEditor) && !useLegacyEditor && hasSelectedPage) return "editor-shell";
  if (isBasicEditor && hasSelectedPage) return "guided-editor";
  return "legacy";
}

export function useCmsEditorPresentationController({
  pathname,
  isTemplateGalleryRoute,
  activeStoreId,
  legacyMode,
}: {
  pathname: string;
  isTemplateGalleryRoute: boolean;
  activeStoreId: string | null;
  legacyMode: boolean;
}) {
  const [workspaceTab, setWorkspaceTab] = useState<CmsEditorWorkspaceTab>(
    isTemplateGalleryRoute ? "gallery" : "pages",
  );
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<CmsEditorPreviewViewport>("desktop");
  const [basicGuideStep, setBasicGuideStep] = useState<CmsEditorBasicGuideStep>("basics");
  const [isActionDockMinimized, setIsActionDockMinimized] = useState(false);
  const [desktopPreviewMode, setDesktopPreviewMode] = useState<CmsEditorDesktopPreviewMode>("side");
  const [desktopPreviewSide, setDesktopPreviewSide] = useState<CmsEditorDesktopPreviewSide>("right");
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [hasCheckedBasicPreview, setHasCheckedBasicPreview] = useState(false);
  const [activeAdvancedCodePanel, setActiveAdvancedCodePanel] = useState<CmsEditorAdvancedCodePanel>("page-json");
  const [draggedAdvancedBlockId, setDraggedAdvancedBlockId] = useState<string | null>(null);

  const builderMode = useMemo(() => resolveCmsEditorBuilderMode(pathname), [pathname]);
  const isAdvancedEditor = builderMode === "advanced";
  const isBasicEditor = builderMode === "basic";
  const useLegacyEditor = legacyMode;

  useEffect(() => {
    setIsMobileSettingsOpen(false);
    setPreviewViewport("desktop");
    setDesktopPreviewMode("side");
    setDesktopPreviewSide("right");
    setIsMobilePreviewOpen(false);
  }, [activeStoreId]);

  return {
    workspaceTab,
    setWorkspaceTab,
    isMobileSettingsOpen,
    setIsMobileSettingsOpen,
    previewViewport,
    setPreviewViewport,
    basicGuideStep,
    setBasicGuideStep,
    isActionDockMinimized,
    setIsActionDockMinimized,
    desktopPreviewMode,
    setDesktopPreviewMode,
    desktopPreviewSide,
    setDesktopPreviewSide,
    isMobilePreviewOpen,
    setIsMobilePreviewOpen,
    hasCheckedBasicPreview,
    setHasCheckedBasicPreview,
    activeAdvancedCodePanel,
    setActiveAdvancedCodePanel,
    draggedAdvancedBlockId,
    setDraggedAdvancedBlockId,
    builderMode,
    isAdvancedEditor,
    isBasicEditor,
    useLegacyEditor,
  };
}
