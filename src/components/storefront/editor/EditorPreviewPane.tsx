import { cn } from "@/lib/utils";
import { EditorPreviewToolbar } from "./EditorPreviewToolbar";
import type { Breakpoint } from "./types";

export function EditorPreviewPane({
  breakpoint,
  onBreakpointChange,
  toolbarContent,
  children,
  className,
}: {
  breakpoint: Breakpoint;
  onBreakpointChange: (value: Breakpoint) => void;
  toolbarContent?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900", className)}>
      <EditorPreviewToolbar breakpoint={breakpoint} onBreakpointChange={onBreakpointChange}>
        {toolbarContent}
      </EditorPreviewToolbar>
      <div className="min-h-0 p-4">{children}</div>
    </section>
  );
}
