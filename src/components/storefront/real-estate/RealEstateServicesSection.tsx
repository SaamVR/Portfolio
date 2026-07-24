"use client";

import { Building2, Home, KeyRound, ShieldCheck } from "lucide-react";

const serviceIcons = [Home, KeyRound, Building2, ShieldCheck];

export function RealEstateServicesSection({
  items,
}: {
  items: Array<{ title: string; description: string }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item, index) => {
        const Icon = serviceIcons[index % serviceIcons.length];
        return (
          <div key={item.title} className="flex gap-4 rounded-[22px] border border-[#dce8dd] bg-white px-5 py-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.15)] dark:border-white/10 dark:bg-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ecf7ee] text-[#1f9b46] dark:bg-secondary/50">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-950 dark:text-foreground">{item.title}</p>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-muted-foreground">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
