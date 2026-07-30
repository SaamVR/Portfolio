"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AdminEmptyStateAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline";
  external?: boolean;
};

export default function AdminEmptyState({
  icon: Icon,
  title,
  description,
  helper,
  actions = [],
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  helper?: string;
  actions?: AdminEmptyStateAction[];
  compact?: boolean;
}) {
  return (
    <Card className="border-border bg-card/50">
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {helper ? <p className="text-sm text-muted-foreground">{helper}</p> : null}
        {actions.length > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {actions.map((action) => {
              if (action.href) {
                return (
                  <Button key={action.label} asChild variant={action.variant ?? "default"}>
                    <a href={action.href} target={action.external ? "_blank" : undefined} rel={action.external ? "noreferrer" : undefined}>
                      {action.label}
                    </a>
                  </Button>
                );
              }

              return (
                <Button key={action.label} type="button" variant={action.variant ?? "default"} onClick={action.onClick}>
                  {action.label}
                </Button>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
