"use client";

import { useCallback, useState } from "react";
import type { BasicTabId, Breakpoint, InspectorTabId } from "./types";

export interface EditorSelectionOptions {
  initialPageId?: string;
  initialSelectedBlockId?: string | null;
  initialBreakpoint?: Breakpoint;
  initialTab?: BasicTabId;
  initialInspectorTab?: InspectorTabId;
  onSelectBlockChange?: (blockId: string | null) => void;
}

export function useEditorSelection(options: EditorSelectionOptions = {}) {
  const [activePageId, setActivePageId] = useState<string>(options.initialPageId ?? "");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(options.initialSelectedBlockId ?? null);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(options.initialBreakpoint ?? "desktop");
  const [activeTab, setActiveTab] = useState<BasicTabId>(options.initialTab ?? "content");
  const [inspectorTab, setInspectorTab] = useState<InspectorTabId>(options.initialInspectorTab ?? "style");

  const selectBlock = useCallback(
    (id: string | null, additive = false) => {
      setSelectedBlockId(id);
      options.onSelectBlockChange?.(id);

      if (id === null) {
        setMultiSelectedIds([]);
        return;
      }

      if (additive) {
        setMultiSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
      } else {
        setMultiSelectedIds([id]);
      }
    },
    [options],
  );

  return {
    activePageId,
    setActivePageId,
    selectedBlockId,
    setSelectedBlockId,
    multiSelectedIds,
    setMultiSelectedIds,
    breakpoint,
    setBreakpoint,
    activeTab,
    setActiveTab,
    inspectorTab,
    setInspectorTab,
    selectBlock,
  };
}
