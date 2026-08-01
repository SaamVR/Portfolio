import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveState } from "./types";

const copy: Record<SaveState, { label: string; className: string; icon: typeof Loader2 }> = {
  idle: { label: "Unsaved", className: "text-amber-600 dark:text-amber-400", icon: AlertCircle as typeof Loader2 },
  saving: { label: "Saving", className: "text-gray-600 dark:text-gray-400", icon: Loader2 },
  saved: { label: "Saved", className: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle2 as typeof Loader2 },
  error: { label: "Not saved", className: "text-red-600 dark:text-red-400", icon: AlertCircle as typeof Loader2 },
};

export function EditorSaveState({
  state,
  detail,
}: {
  state: SaveState;
  detail?: string | null;
}) {
  const meta = copy[state];
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-2">
      <span className={cn("flex items-center gap-1.5 text-sm font-medium", meta.className)}>
        <Icon className={cn("h-4 w-4", state === "saving" && "animate-spin")} />
        {meta.label}
      </span>
      {detail ? <span className="hidden text-xs text-gray-500 dark:text-gray-500 xl:inline">{detail}</span> : null}
    </div>
  );
}
