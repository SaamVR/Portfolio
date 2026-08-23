"use client";

import { cn } from "@/lib/utils";

export type SubscriptionPlanOption = {
  id: string;
  label: string;
  description: string;
};

export function SubscriptionPlanSelector({
  plans,
  value,
  onChange,
}: {
  plans: SubscriptionPlanOption[];
  value: string;
  onChange: (planId: string) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
      {plans.map((plan) => (
        <button
          key={plan.id}
          type="button"
          onClick={() => onChange(plan.id)}
          className={cn(
            "min-w-0 rounded-2xl border px-3 py-3 text-left transition-colors",
            value === plan.id
              ? "border-primary bg-primary/5"
              : "border-[#dce9df] bg-white hover:border-primary/30 dark:border-white/10 dark:bg-card",
          )}
        >
          <p className="text-sm font-semibold text-slate-950 dark:text-foreground">{plan.label}</p>
          <p className="mt-1 break-words text-[11px] leading-5 text-slate-500 dark:text-muted-foreground">{plan.description}</p>
        </button>
      ))}
    </div>
  );
}
