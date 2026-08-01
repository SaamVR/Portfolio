"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EditorModeToggle } from "./EditorModeToggle";
import { EditorPageSelector } from "./EditorPageSelector";
import { EditorSaveState } from "./EditorSaveState";
import type { EditorHeaderAction, EditorMode, EditorPageOption, SaveState } from "./types";

export function EditorHeader({
  storeName,
  mode,
  onModeChange,
  pages,
  activePageId,
  onPageChange,
  saveState,
  saveDetail,
  canUseAdvanced,
  actions = [],
}: {
  storeName: string;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  pages: EditorPageOption[];
  activePageId: string;
  onPageChange: (id: string) => void;
  saveState: SaveState;
  saveDetail?: string | null;
  canUseAdvanced?: boolean;
  actions?: EditorHeaderAction[];
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-gray-50/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{storeName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">Storefront editor</p>
        </div>
        <EditorPageSelector pages={pages} value={activePageId} onChange={onPageChange} />
        <EditorModeToggle mode={mode} onChange={onModeChange} canUseAdvanced={canUseAdvanced} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <EditorSaveState state={saveState} detail={saveDetail} />
          {actions.map((action) => {
            const content = (
              <>
                {action.icon ? <action.icon className="h-4 w-4" /> : null}
                {action.label}
              </>
            );
            if (action.href) {
              return (
                <Button key={action.id} type="button" variant={action.variant ?? "outline"} size="sm" asChild disabled={action.disabled}>
                  <Link href={action.href}>{content}</Link>
                </Button>
              );
            }
            return (
              <Button
                key={action.id}
                type="button"
                variant={action.variant ?? "outline"}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className="gap-2"
              >
                {content}
              </Button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
