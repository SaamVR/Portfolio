"use client";

import { useEffect, useState } from "react";
import type { BasicTabId, Breakpoint, EditorMode, SaveState } from "./types";

type UseEditorShellStateOptions = {
  initialMode: EditorMode;
  initialPageId?: string;
  initialTab?: BasicTabId;
  initialBreakpoint?: Breakpoint;
  initialPanelWidth?: number;
  saveState?: SaveState;
};

export function useEditorShellState({
  initialMode,
  initialPageId,
  initialTab = "content",
  initialBreakpoint = "desktop",
  initialPanelWidth = 400,
  saveState = "idle",
}: UseEditorShellStateOptions) {
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [activePageId, setActivePageId] = useState(initialPageId ?? "");
  const [activeTab, setActiveTab] = useState<BasicTabId>(initialTab);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(initialBreakpoint);
  const [panelWidth, setPanelWidth] = useState(initialPanelWidth);
  const [currentSaveState, setCurrentSaveState] = useState<SaveState>(saveState);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialPageId) {
      setActivePageId(initialPageId);
    }
  }, [initialPageId]);

  useEffect(() => {
    setCurrentSaveState(saveState);
  }, [saveState]);

  return {
    mode,
    setMode,
    activePageId,
    setActivePageId,
    activeTab,
    setActiveTab,
    breakpoint,
    setBreakpoint,
    panelWidth,
    setPanelWidth,
    saveState: currentSaveState,
    setSaveState: setCurrentSaveState,
  };
}
