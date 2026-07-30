"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Radio, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPlatformGlobalSettings,
  type PlatformGlobalSettings,
} from "@/lib/platform/global-settings";
import { cn } from "@/lib/utils";

interface PlatformBroadcastBannerProps {
  className?: string;
  isPaidMerchant?: boolean;
}

export function PlatformBroadcastBanner({
  className,
  isPaidMerchant = false,
}: PlatformBroadcastBannerProps) {
  const [settings, setSettings] = useState<PlatformGlobalSettings | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    void fetchPlatformGlobalSettings(supabase).then((res) => {
      if (mounted) {
        setSettings(res);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!settings || !settings.broadcastBannerEnabled || !settings.broadcastBannerMessage || dismissed) {
    return null;
  }

  // Check target scope
  if (settings.broadcastBannerTargetScope === "free_merchants" && isPaidMerchant) {
    return null;
  }
  if (settings.broadcastBannerTargetScope === "paid_merchants" && !isPaidMerchant) {
    return null;
  }

  const variantStyles = {
    info: "bg-blue-500/10 text-blue-800 dark:text-blue-200 border-blue-500/30",
    warning: "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/30",
    critical: "bg-red-500/10 text-red-900 dark:text-red-200 border-red-500/30",
    success: "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/30",
  }[settings.broadcastBannerVariant || "info"];

  const IconComponent = {
    info: Info,
    warning: AlertTriangle,
    critical: Radio,
    success: CheckCircle2,
  }[settings.broadcastBannerVariant || "info"];

  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-xs font-medium transition-all shadow-xs",
        variantStyles,
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <IconComponent className="h-4 w-4 shrink-0" />
        <span className="truncate">{settings.broadcastBannerMessage}</span>
      </div>

      {settings.broadcastBannerDismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
