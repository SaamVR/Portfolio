"use client";

import { Monitor, PanelsTopLeft, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Breakpoint } from "./types";

const deviceButtons: Array<{ id: Breakpoint; label: string; icon: typeof Monitor }> = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: PanelsTopLeft },
  { id: "mobile", label: "Mobile", icon: Smartphone },
];

export function EditorPreviewToolbar({
  breakpoint,
  onBreakpointChange,
  children,
}: {
  breakpoint: Breakpoint;
  onBreakpointChange: (value: Breakpoint) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-gray-200 px-4 dark:border-gray-800">
      <div className="flex items-center rounded-lg border border-gray-200 p-1 dark:border-gray-800">
        {deviceButtons.map((device) => {
          const Icon = device.icon;
          return (
            <Button
              key={device.id}
              type="button"
              size="icon"
              variant={breakpoint === device.id ? "secondary" : "ghost"}
              className="h-8 w-8"
              aria-label={device.label}
              aria-pressed={breakpoint === device.id}
              onClick={() => onBreakpointChange(device.id)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
      <div className="flex min-w-0 items-center gap-2">{children}</div>
    </div>
  );
}
