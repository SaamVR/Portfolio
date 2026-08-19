"use client";

import { CheckCircle2, CircleAlert, Gauge, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BlogQualityCheckGroup, BlogQualityReport } from "@/lib/cms/blog-quality";
import { cn } from "@/lib/utils";

const groupLabels: Record<BlogQualityCheckGroup, string> = {
  content: "Content",
  seo: "Search & accessibility",
  discoverability: "Discovery",
  commerce: "Commerce",
};

const groupOrder: BlogQualityCheckGroup[] = ["content", "seo", "discoverability", "commerce"];

function scoreTone(score: number) {
  if (score >= 90) return "text-emerald-600";
  if (score >= 75) return "text-primary";
  if (score >= 60) return "text-amber-600";
  return "text-destructive";
}

export default function BlogQualityPanel({ report }: { report: BlogQualityReport }) {
  return (
    <Card className="border-border bg-card/50">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              <CardTitle>Publish readiness</CardTitle>
            </div>
            <CardDescription className="mt-2 max-w-2xl">
              Live guidance for ecommerce content quality, search presentation, accessibility, discovery, and conversion paths. It never blocks saving or publishing.
            </CardDescription>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 px-5 py-4 text-center sm:min-w-36">
            <p className={cn("text-3xl font-bold", scoreTone(report.score))}>{report.score}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">out of 100</p>
            <p className="mt-1 text-xs font-semibold text-foreground">{report.label}</p>
          </div>
        </div>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${report.score}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{report.passedCount}/{report.totalCount} checks complete</span>
            <span>{report.wordCount.toLocaleString()} words</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          {groupOrder.map((group) => {
            const checks = report.checks.filter((check) => check.group === group);
            return (
              <section key={group} className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{groupLabels[group]}</p>
                  <span className="text-xs text-muted-foreground">{checks.filter((check) => check.passed).length}/{checks.length}</span>
                </div>
                <div className="mt-3 space-y-3">
                  {checks.map((check) => (
                    <div key={check.id} className="flex items-start gap-3">
                      {check.passed ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      )}
                      <div className="min-w-0">
                        <p className={cn("text-xs font-semibold", check.passed ? "text-foreground" : "text-amber-700 dark:text-amber-400")}>{check.label}</p>
                        {!check.passed ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{check.description}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {report.advisories.length > 0 ? (
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">Context</p>
            </div>
            <div className="mt-2 space-y-1">
              {report.advisories.map((advisory) => <p key={advisory} className="text-xs leading-5 text-muted-foreground">{advisory}</p>)}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
