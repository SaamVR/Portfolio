import { EditorPreviewPane } from "../EditorPreviewPane";
import type { Breakpoint } from "../types";

export function AdvancedModeLayout({
  tree,
  inspector,
  preview,
  breakpoint,
  onBreakpointChange,
  previewToolbarContent,
}: {
  tree: React.ReactNode;
  inspector: React.ReactNode;
  preview: React.ReactNode;
  breakpoint: Breakpoint;
  onBreakpointChange: (value: Breakpoint) => void;
  previewToolbarContent?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-56px)] grid-cols-1 bg-gray-50 xl:grid-cols-[260px_minmax(0,1fr)_320px] dark:bg-gray-950">
      <aside className="hidden border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 xl:block">
        <div className="h-full overflow-y-auto p-4">{tree}</div>
      </aside>
      <main className="min-w-0 p-4">
        <EditorPreviewPane breakpoint={breakpoint} onBreakpointChange={onBreakpointChange} toolbarContent={previewToolbarContent} className="h-full">
          {preview}
        </EditorPreviewPane>
      </main>
      <aside className="hidden border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 xl:block">
        <div className="h-full overflow-y-auto p-4">{inspector}</div>
      </aside>
    </div>
  );
}
