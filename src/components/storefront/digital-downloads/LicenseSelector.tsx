"use client";

import type { DigitalLicenseOption } from "@/components/storefront/digital-downloads/digital-download-utils";
import { cn } from "@/lib/utils";

export function LicenseSelector({
  licenses,
  value,
  onChange,
}: {
  licenses: DigitalLicenseOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      {licenses.map((license) => (
        <button
          key={license.id}
          type="button"
          onClick={() => onChange(license.id)}
          className={cn(
            "w-full min-w-0 rounded-[18px] border px-3 py-3 text-left transition-colors",
            value === license.id
              ? "border-primary bg-primary/8"
              : "border-[#e6ebe7] bg-white hover:border-primary/30 dark:border-white/10 dark:bg-card",
          )}
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950 dark:text-foreground">{license.label}</p>
              <p className="break-words text-xs text-slate-500 dark:text-muted-foreground">{license.description}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-slate-950 dark:text-foreground">BDT {license.price}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
