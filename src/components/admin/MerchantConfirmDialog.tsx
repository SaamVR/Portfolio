"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Info, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type MerchantConfirmTone = "default" | "warning" | "destructive";

export type MerchantConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  entityLabel?: string;
  entityValue?: string;
  storeName?: string;
  impacts?: string[];
  warning?: string;
  recoveryText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: MerchantConfirmTone;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
};

const toneStyles: Record<MerchantConfirmTone, { icon: string; panel: string; button: "default" | "destructive" }> = {
  default: {
    icon: "text-primary",
    panel: "border-border bg-muted/30",
    button: "default",
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400",
    panel: "border-amber-500/25 bg-amber-500/10",
    button: "default",
  },
  destructive: {
    icon: "text-destructive",
    panel: "border-destructive/25 bg-destructive/5",
    button: "destructive",
  },
};

export function MerchantConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  entityLabel,
  entityValue,
  storeName,
  impacts = [],
  warning,
  recoveryText,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  pending = false,
  onConfirm,
}: MerchantConfirmDialogProps) {
  const styles = toneStyles[tone];
  const Icon = tone === "destructive" ? ShieldAlert : tone === "warning" ? AlertTriangle : Info;

  const handleOpenChange = (nextOpen: boolean) => {
    if (pending && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        aria-busy={pending}
        className="max-h-[min(90vh,640px)] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto rounded-2xl p-4 sm:p-6"
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-start gap-2 text-left">
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", styles.icon)} />
            <span>{title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left leading-6">{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {(entityValue || storeName) ? (
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
            {entityValue ? (
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{entityLabel ?? "Affected item"}</span>
                <span className="font-semibold text-foreground">{entityValue}</span>
              </div>
            ) : null}
            {storeName ? (
              <div className={cn("flex flex-wrap items-baseline justify-between gap-2", entityValue && "mt-2 border-t border-border pt-2")}>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Store</span>
                <span className="font-medium text-foreground">{storeName}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {impacts.length > 0 ? (
          <div className={cn("rounded-xl border p-3 text-sm", styles.panel)}>
            <p className="font-medium text-foreground">What this will do</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {impacts.map((impact, index) => <li key={`${index}-${impact}`}>{impact}</li>)}
            </ul>
          </div>
        ) : null}

        {warning ? <p className="text-sm font-medium text-foreground">{warning}</p> : null}
        {recoveryText ? <p className="text-sm text-muted-foreground">{recoveryText}</p> : null}

        <span className="sr-only" aria-live="polite">{pending ? "Action in progress" : ""}</span>
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button
            type="button"
            variant={styles.button}
            disabled={pending}
            onClick={() => void onConfirm()}
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {pending ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


export type MerchantConfirmOptions = Omit<
  MerchantConfirmDialogProps,
  "open" | "onOpenChange" | "pending" | "onConfirm"
>;

export function useMerchantConfirm() {
  const [request, setRequest] = useState<MerchantConfirmOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setRequest(null);
    resolve?.(confirmed);
  }, []);

  const confirm = useCallback((options: MerchantConfirmOptions) => {
    resolverRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setRequest(options);
    });
  }, []);

  useEffect(() => () => {
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  const confirmationDialog = request ? (
    <MerchantConfirmDialog
      {...request}
      open
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
      onConfirm={() => settle(true)}
    />
  ) : null;

  return { confirm, confirmationDialog };
}
