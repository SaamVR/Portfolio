"use client";

import { Coffee, ConciergeBell, Dumbbell, ShieldCheck, Sparkles, UtensilsCrossed, Wifi } from "lucide-react";

const amenityIcons = [Wifi, Sparkles, Dumbbell, UtensilsCrossed, ConciergeBell, Coffee, ShieldCheck];

export function AmenitiesGrid({
  items,
}: {
  items: Array<{ title: string; description: string }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {items.map((item, index) => {
        const Icon = amenityIcons[index % amenityIcons.length];
        return (
          <div key={`${item.title}-${index}`} className="rounded-[22px] border border-[#dfe8e1] bg-white px-4 py-5 text-center shadow-[0_16px_32px_-30px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#edf4ef] text-[#285c46] dark:bg-secondary/50">
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-950 dark:text-foreground">{item.title}</p>
            <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-muted-foreground">{item.description}</p>
          </div>
        );
      })}
    </div>
  );
}
