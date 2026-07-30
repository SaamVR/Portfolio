"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AdminRecoveryPanelProps = {
  title: string;
  description: string;
  loadingLabel?: string;
  retryLabel?: string;
  secondaryLabel?: string;
  onRetry?: () => void;
  onSecondary?: () => void;
  fullHeight?: boolean;
  timeoutMs?: number;
  countdownSeconds?: number;
  autoRetry?: boolean;
  statusHint?: string;
};

export default function AdminRecoveryPanel({
  title,
  description,
  loadingLabel = "Restoring workspace",
  retryLabel = "Retry",
  secondaryLabel,
  onRetry,
  onSecondary,
  fullHeight = false,
  timeoutMs = 4000,
  countdownSeconds = 12,
  autoRetry = false,
  statusHint,
}: AdminRecoveryPanelProps) {
  const [showActions, setShowActions] = useState(false);
  const [countdown, setCountdown] = useState(countdownSeconds);
  const autoRetriedRef = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowActions(true), timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [timeoutMs]);

  useEffect(() => {
    setCountdown(countdownSeconds);
    autoRetriedRef.current = false;
  }, [countdownSeconds, title, description]);

  useEffect(() => {
    if (!showActions || countdownSeconds <= 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          if (autoRetry && onRetry && !autoRetriedRef.current) {
            autoRetriedRef.current = true;
            void onRetry();
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [autoRetry, countdownSeconds, onRetry, showActions]);

  return (
    <div className={fullHeight ? "flex min-h-screen items-center justify-center bg-background px-6" : "py-8"}>
      <Card className="w-full max-w-xl border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{loadingLabel}</p>
          {statusHint ? <p className="text-xs text-muted-foreground">{statusHint}</p> : null}
          {showActions ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {countdown > 0
                  ? `Automatic retry ${autoRetry ? "starts" : "is available"} in ${countdown}s.`
                  : autoRetry
                    ? "Automatic retry started. You can still retry again manually."
                    : "Automatic retry window has opened. You can retry now."}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                {onRetry ? (
                  <Button type="button" onClick={onRetry} className="gap-2">
                    {retryLabel}
                  </Button>
                ) : null}
                {onSecondary && secondaryLabel ? (
                  <Button type="button" variant="outline" onClick={onSecondary}>
                    {secondaryLabel}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
