import { BasicMobileDock } from "./BasicMobileDock";
import { BasicPanelHeader } from "./BasicPanelHeader";
import { BasicRail } from "./BasicRail";
import { BasicTabPillBar } from "./BasicTabPillBar";
import { EditorPreviewPane } from "../EditorPreviewPane";
import { EditorResizeHandle } from "../EditorResizeHandle";
import type { BasicRailItem, BasicTabId, Breakpoint } from "../types";
import type { CSSProperties, ReactNode } from "react";

export function BasicModeLayout({
  items,
  activeTab,
  onTabChange,
  panelWidth,
  onPanelWidthChange,
  panelTitle,
  panelBreadcrumb,
  panelHelp,
  panelContent,
  breakpoint,
  onBreakpointChange,
  previewContent,
  previewToolbarContent,
  onMobilePreview,
  onUndo,
  onRedo,
  onSave,
  canUndo,
  canRedo,
  saveLabel,
}: {
  items: BasicRailItem[];
  activeTab: BasicTabId;
  onTabChange: (tab: BasicTabId) => void;
  panelWidth: number;
  onPanelWidthChange: (value: number) => void;
  panelTitle: string;
  panelBreadcrumb?: string;
  panelHelp?: string;
  panelContent: ReactNode;
  breakpoint: Breakpoint;
  onBreakpointChange: (value: Breakpoint) => void;
  previewContent: ReactNode;
  previewToolbarContent?: ReactNode;
  onMobilePreview: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  saveLabel: string;
}) {
  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeTab));
  const panelStyle = { "--basic-panel-width": `${panelWidth}px` } as CSSProperties;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 dark:bg-gray-950">
      <BasicTabPillBar items={items} activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex min-h-[calc(100vh-112px)]">
        <BasicRail items={items} activeTab={activeTab} onTabChange={onTabChange} />
        <section className="flex min-w-0 flex-1">
          <div
            className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:flex-none lg:[width:var(--basic-panel-width)]"
            style={panelStyle}
          >
            <div className="min-h-[calc(100vh-160px)] overflow-y-auto p-4 pb-24 lg:min-h-0 lg:flex-1 lg:pb-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-gray-500 lg:hidden">
                Task {activeIndex + 1} of {items.length}
              </p>
              <BasicPanelHeader title={panelTitle} breadcrumb={panelBreadcrumb} help={panelHelp} />
              <div className="pt-4">{panelContent}</div>
            </div>
          </div>
          <EditorResizeHandle value={panelWidth} onChange={onPanelWidthChange} />
          <div className="hidden min-w-0 flex-1 p-4 lg:block">
            <EditorPreviewPane breakpoint={breakpoint} onBreakpointChange={onBreakpointChange} toolbarContent={previewToolbarContent} className="h-full">
              {previewContent}
            </EditorPreviewPane>
          </div>
        </section>
      </div>
      <BasicMobileDock
        onPreview={onMobilePreview}
        onUndo={onUndo}
        onRedo={onRedo}
        onSave={onSave}
        disableUndo={!canUndo}
        disableRedo={!canRedo}
        saveLabel={saveLabel}
      />
    </div>
  );
}
