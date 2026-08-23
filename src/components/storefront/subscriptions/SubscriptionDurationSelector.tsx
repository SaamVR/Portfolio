"use client";

import { cn } from "@/lib/utils";

export type SubscriptionDurationOption = {
  id: "monthly" | "yearly";
  label: string;
  price: number;
  hint: string;
};

export function SubscriptionDurationSelector({
  durations,
  value,
  onChange,
}: {
  durations: SubscriptionDurationOption[];
  value: "monthly" | "yearly";
  onChange: (durationId: "monthly" | "yearly") => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
      {durations.map((duration) => (
        <button
          key={duration.id}
          type="button"
          onClick={() => onChange(duration.id)}
          className={cn(
            "min-w-0 rounded-2xl border px-3 py-3 text-left transition-colors",
            value === duration.id
              ? "border-primary bg-primary/5"
              : "border-[#dce9df] bg-white hover:border-primary/30 dark:border-white/10 dark:bg-card",
          )}
        >
          <p className="text-sm font-semibold text-slate-950 dark:text-foreground">{duration.label}</p>
          <p className="mt-1 text-sm font-bold text-primary">BDT {duration.price.toLocaleString()}</p>
          <p className="mt-1 break-words text-[11px] leading-5 text-slate-500 dark:text-muted-foreground">{duration.hint}</p>
        </button>
      ))}
    </div>
  );
}
