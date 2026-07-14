"use client";

import { Loader2 } from "lucide-react";

export default function AdminRouteFallback({
  label = "Loading workspace",
  fullScreen = false,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  return (
    <div className={fullScreen ? "flex min-h-screen items-center justify-center bg-background" : "flex min-h-[40vh] items-center justify-center"}>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/90 px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>{label}</span>
      </div>
    </div>
  );
}
