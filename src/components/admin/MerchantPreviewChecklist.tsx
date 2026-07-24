import * as React from "react";
import { Badge } from "@/components/ui/badge";

export interface PreviewChecklistItem {
  label: string;
  done: boolean;
  hint?: string;
}

export interface MerchantPreviewChecklistProps {
  items: PreviewChecklistItem[];
  className?: string;
}

export function MerchantPreviewChecklist({ items, className = "" }: MerchantPreviewChecklistProps) {
  const readyCount = items.filter((item) => item.done).length;
  
  return (
    <div className={`mb-4 rounded-xl border border-border/70 bg-background/80 p-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Preview Checklist</p>
        <Badge variant="outline">{readyCount}/{items.length} ready</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card/70 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              {item.hint && <p className="mt-1 text-[11px] text-muted-foreground">{item.hint}</p>}
            </div>
            <Badge variant={item.done ? "outline" : "secondary"}>{item.done ? "Good" : "Check"}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
