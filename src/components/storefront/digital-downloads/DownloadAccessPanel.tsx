"use client";

import { Clock3, LockKeyhole, ShieldCheck } from "lucide-react";

export function DownloadAccessPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className={`rounded-[24px] border border-[#dcefdc] bg-[linear-gradient(135deg,#f6fcf5_0%,#ffffff_100%)] ${compact ? "p-4" : "p-5"} dark:border-primary/20 dark:bg-primary/5`}>
      <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-3"}`.trim()}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock3 className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-foreground">Instant-access ready</p>
            <p className="text-xs leading-6 text-slate-500 dark:text-muted-foreground">Digital orders skip physical delivery and are prepared for fast handoff after checkout.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LockKeyhole className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-foreground">Protected fulfillment</p>
            <p className="text-xs leading-6 text-slate-500 dark:text-muted-foreground">Access should be released only after confirmed payment and merchant approval rules are satisfied.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-foreground">Merchant-controlled</p>
            <p className="text-xs leading-6 text-slate-500 dark:text-muted-foreground">Licensing, support terms, and customer delivery promises stay under each store&apos;s own settings and fulfillment workflow.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
