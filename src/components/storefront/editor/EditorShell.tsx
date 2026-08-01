"use client";

import { useMemo } from "react";
import { Eye, Rocket, Save } from "lucide-react";
import { EditorHeader } from "./EditorHeader";
import { useEditorShellState } from "./useEditorShellState";
import { BasicModeLayout } from "./basic/BasicModeLayout";
import { AdvancedModeLayout } from "./advanced/AdvancedModeLayout";
import { AdvancedUnsupportedNotice } from "./advanced/AdvancedUnsupportedNotice";
import type {
  BasicRailItem,
  BasicTabId,
  Breakpoint,
  EditorHeaderAction,
  EditorMode,
  SaveState,
} from "./types";
import type { Store, StorePage } from "@/lib/cms/schema";

export interface EditorShellProps {
  store: Store;
  pages: StorePage[];
  activePageId: string;
  onPageChange: (id: string) => void;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  breakpoint?: Breakpoint;
  onBreakpointChange?: (value: Breakpoint) => void;
  canUseAdvanced: boolean;
  saveState: SaveState;
  saveDetail?: string | null;
  basicItems: BasicRailItem[];
  initialTab?: BasicTabId;
  panelTitle: string;
  panelBreadcrumb?: string;
  panelHelp?: string;
  renderBasicPanel: (tab: BasicTabId, page: StorePage | null) => React.ReactNode;
  renderPreview: (page: StorePage | null, breakpoint: Breakpoint) => React.ReactNode;
  renderAdvancedTree: (page: StorePage | null) => React.ReactNode;
  renderAdvancedInspector: (page: StorePage | null, breakpoint: Breakpoint) => React.ReactNode;
  headerActions?: EditorHeaderAction[];
  previewToolbarContent?: React.ReactNode;
  onMobilePreview: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  saveLabel: string;
}

export function EditorShell({
  store,
  pages,
  activePageId,
  onPageChange,
  mode,
  onModeChange,
  breakpoint,
  onBreakpointChange,
  canUseAdvanced,
  saveState,
  saveDetail,
  basicItems,
  initialTab = "content",
  panelTitle,
  panelBreadcrumb,
  panelHelp,
  renderBasicPanel,
  renderPreview,
  renderAdvancedTree,
  renderAdvancedInspector,
  headerActions,
  previewToolbarContent,
  onMobilePreview,
  onUndo,
  onRedo,
  onSave,
  canUndo,
  canRedo,
  saveLabel,
}: EditorShellProps) {
  const shell = useEditorShellState({
    initialMode: mode,
    initialPageId: activePageId,
    initialTab,
    initialBreakpoint: breakpoint ?? "desktop",
    saveState,
  });

  const pageOptions = useMemo(
    () => pages.map((page) => ({ id: page.id, title: page.title, slug: page.slug })),
    [pages],
  );
  const selectedPage = pages.find((page) => page.id === activePageId) ?? null;
  const selectedBreakpoint = breakpoint ?? shell.breakpoint;
  const actions = headerActions ?? [
    { id: "preview", label: "Preview", icon: Eye, onClick: onMobilePreview, variant: "outline" },
    { id: "save", label: saveLabel, icon: Save, onClick: onSave },
    { id: "publish", label: "Publish", icon: Rocket, onClick: onSave, variant: "secondary" },
  ];

  const setMode = (nextMode: EditorMode) => {
    if (nextMode === "advanced" && !canUseAdvanced) return;
    shell.setMode(nextMode);
    onModeChange(nextMode);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <EditorHeader
        storeName={store.name}
        mode={mode}
        onModeChange={setMode}
        pages={pageOptions}
        activePageId={activePageId}
        onPageChange={(pageId) => {
          shell.setActivePageId(pageId);
          onPageChange(pageId);
        }}
        saveState={saveState}
        saveDetail={saveDetail}
        canUseAdvanced={canUseAdvanced}
        actions={actions}
      />
      {mode === "advanced" && !canUseAdvanced ? (
        <AdvancedUnsupportedNotice reason="plan" onSwitchToBasic={() => setMode("basic")} />
      ) : mode === "advanced" ? (
        <div className="xl:block">
          <div className="hidden xl:block">
            <AdvancedModeLayout
              tree={renderAdvancedTree(selectedPage)}
              inspector={renderAdvancedInspector(selectedPage, selectedBreakpoint)}
              preview={renderPreview(selectedPage, selectedBreakpoint)}
              breakpoint={selectedBreakpoint}
              onBreakpointChange={onBreakpointChange ?? shell.setBreakpoint}
              previewToolbarContent={previewToolbarContent}
            />
          </div>
          <div className="xl:hidden">
            <AdvancedUnsupportedNotice onSwitchToBasic={() => setMode("basic")} />
          </div>
        </div>
      ) : (
        <BasicModeLayout
          items={basicItems}
          activeTab={shell.activeTab}
          onTabChange={shell.setActiveTab}
          panelWidth={shell.panelWidth}
          onPanelWidthChange={shell.setPanelWidth}
          panelTitle={panelTitle}
          panelBreadcrumb={panelBreadcrumb}
          panelHelp={panelHelp}
          panelContent={renderBasicPanel(shell.activeTab, selectedPage)}
          breakpoint={selectedBreakpoint}
          onBreakpointChange={onBreakpointChange ?? shell.setBreakpoint}
          previewContent={renderPreview(selectedPage, selectedBreakpoint)}
          previewToolbarContent={previewToolbarContent}
          onMobilePreview={onMobilePreview}
          onUndo={onUndo}
          onRedo={onRedo}
          onSave={onSave}
          canUndo={canUndo}
          canRedo={canRedo}
          saveLabel={saveLabel}
        />
      )}
    </div>
  );
}
