"use client";

import { AlertCircle, CheckCircle2, Loader2, Monitor, RotateCcw, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SectionStudioPreviewMode = "desktop" | "mobile";
export type SectionStudioOverrideState = "inherited" | "explicit";
export type SectionStudioSaveState = "saved" | "unsaved" | "saving" | "error";

export function SectionStudioPreviewModeSwitch({
  value,
  onChange,
  className,
}: {
  value: SectionStudioPreviewMode;
  onChange: (mode: SectionStudioPreviewMode) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("flex rounded-xl border border-border bg-muted/30 p-1", className)}
      role="group"
      aria-label="Preview device"
    >
      <Button
        type="button"
        size="sm"
        variant={value === "desktop" ? "secondary" : "ghost"}
        className="min-h-11 min-w-11 gap-1.5"
        aria-pressed={value === "desktop"}
        onClick={() => onChange("desktop")}
      >
        <Monitor className="h-3.5 w-3.5" />
        Desktop
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "mobile" ? "secondary" : "ghost"}
        className="min-h-11 min-w-11 gap-1.5"
        aria-pressed={value === "mobile"}
        onClick={() => onChange("mobile")}
      >
        <Smartphone className="h-3.5 w-3.5" />
        Mobile
      </Button>
    </div>
  );
}
export function SectionStudioOptionShell({
  label,
  description,
  state,
  inheritedLabel = "Inherited",
  explicitLabel = "Override",
  onReset,
  resetDisabled,
  children,
  className,
}: {
  label: string;
  description?: string;
  state: SectionStudioOverrideState;
  inheritedLabel?: string;
  explicitLabel?: string;
  onReset?: () => void;
  resetDisabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const explicit = state === "explicit";
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4", className)} aria-label={label}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            <Badge variant={explicit ? "secondary" : "outline"} className="text-[10px]">
              {explicit ? explicitLabel : inheritedLabel}
            </Badge>
          </div>
          {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
        </div>
        {onReset ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 shrink-0 gap-1.5"
            disabled={!explicit || resetDisabled}
            onClick={onReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
export function SectionStudioSaveStatus({
  state,
  label,
  detail,
  className,
}: {
  state: SectionStudioSaveState;
  label: string;
  detail?: string;
  className?: string;
}) {
  const Icon = state === "saving" ? Loader2 : state === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-xl border px-3 py-2.5 text-xs",
        state === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border bg-muted/20 text-muted-foreground",
        className,
      )}
      role={state === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", state === "saving" && "animate-spin")} />
      <div className="min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        {detail ? <p className="mt-0.5 leading-5">{detail}</p> : null}
      </div>
    </div>
  );
}

export function SectionStudioPreviewStage({
  mode,
  children,
  className,
}: {
  mode: SectionStudioPreviewMode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-muted/20 p-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
        <span>{mode === "mobile" ? "Mobile preview" : "Desktop preview"}</span>
        <span>{mode === "mobile" ? "390px reference" : "Responsive canvas"}</span>
      </div>
      <div className={cn("mx-auto transition-[max-width]", mode === "mobile" ? "max-w-[390px]" : "max-w-none")}>
        {children}
      </div>
    </div>
  );
}
