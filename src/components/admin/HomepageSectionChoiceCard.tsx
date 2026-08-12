"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HomepageSectionChoice } from "@/lib/cms/template-homepage-sections";

type HomepageSectionChoiceCardProps = {
  section: HomepageSectionChoice;
  enabled: boolean;
  statusLabels: {
    enabled: string;
    disabled: string;
  };
  actionLabels?: {
    enable: string;
    disable: string;
  };
  onEnabledChange: (enabled: boolean) => void;
  editLink?: ReactNode;
  editHint?: string;
};

export function HomepageSectionChoiceCard({
  section,
  enabled,
  statusLabels,
  actionLabels = {
    enable: "Show on homepage",
    disable: "Leave off for now",
  },
  onEnabledChange,
  editLink,
  editHint = "You can update the copy and layout later from the matching editor.",
}: HomepageSectionChoiceCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex gap-4">
        <div className="w-28 shrink-0 rounded-lg border border-border bg-background p-2">
          <div className="space-y-1.5">
            <div className="h-2 rounded bg-muted" />
            <div className="h-8 rounded bg-primary/15" />
            <div
              className={cn(
                "h-10 rounded border transition-colors",
                enabled
                  ? "border-primary/30 bg-primary/10"
                  : "border-dashed border-muted-foreground/30 bg-muted/30",
              )}
            />
            <div className="grid grid-cols-3 gap-1">
              <div className="h-5 rounded bg-muted" />
              <div className="h-5 rounded bg-muted" />
              <div className="h-5 rounded bg-muted" />
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-center text-[10px] leading-4 text-muted-foreground">
            {section.label}
          </p>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{section.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{section.description}</p>
            </div>
            <Badge variant={enabled ? "secondary" : "outline"} className="w-fit">
              {enabled ? statusLabels.enabled : statusLabels.disabled}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label={`${section.label} homepage visibility`}>
            <Button
              type="button"
              size="sm"
              variant={enabled ? "default" : "outline"}
              className="gap-1.5"
              onClick={() => onEnabledChange(true)}
            >
              {actionLabels.enable}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!enabled ? "secondary" : "outline"}
              className="gap-1.5"
              onClick={() => onEnabledChange(false)}
            >
              {actionLabels.disable}
            </Button>
          </div>

          {(editLink || editHint) ? (
            <div className="space-y-1">
              {editHint ? (
                <p className="text-xs leading-5 text-muted-foreground">{editHint}</p>
              ) : null}
              {editLink ? (
                <div className="text-xs">
                  {editLink}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const homepageSectionLinkIconClassName = "h-3.5 w-3.5";
export const HomepageSectionLinkArrow = ArrowRight;
