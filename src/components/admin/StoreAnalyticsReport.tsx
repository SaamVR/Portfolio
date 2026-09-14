import {
  CheckCircle2,
  CreditCard,
  Eye,
  MousePointerClick,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsReportSummary, AnalyticsStoreSummary } from "@/lib/analytics/report";
import StoreAnalyticsReportDetailed from "./StoreAnalyticsReportDetailed";

type StoreAnalyticsReportProps = {
  title: string;
  description: string;
  report: AnalyticsReportSummary;
  previousReport?: AnalyticsReportSummary | null;
  storeSummaries?: AnalyticsStoreSummary[];
  storeSummaryTitle?: string;
  storeSummaryDescription?: string;
};

function ratePercent(rate?: number) {
  return Math.round(Math.min(1, Math.max(0, rate ?? 0)) * 100);
}

export default function StoreAnalyticsReport(props: StoreAnalyticsReportProps) {
  const { title, description, report } = props;
  const flow = [
    { label: "Visitors", value: report.visitors, icon: Eye },
    { label: "Product views", value: report.productViews, icon: MousePointerClick },
    { label: "Add to cart", value: report.addToCart, icon: ShoppingCart },
    { label: "Checkout", value: report.checkoutStarts, icon: CreditCard },
    { label: "Purchases", value: report.purchases, icon: CheckCircle2 },
  ];
  const flowMaximum = Math.max(1, ...flow.map((step) => step.value));
  const gauges = [
    { label: "Visitor → purchase", value: ratePercent(report.visitorToPurchaseRate) },
    { label: "Cart → checkout", value: ratePercent(report.cartToCheckoutRate) },
    { label: "Checkout complete", value: ratePercent(report.checkoutCompletionRate) },
  ];

  return (
    <div className="space-y-7">
      <section className="space-y-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Visual performance snapshot
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">{description}</p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
          <Card className="overflow-hidden border-border bg-card/60 motion-safe:transition-transform motion-safe:duration-300 hover:-translate-y-0.5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Shopper journey</CardTitle>
              <CardDescription>A visual read of how traffic moves from attention to completed purchase.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {flow.map((step, index) => {
                const Icon = step.icon;
                const width = step.value === 0 ? 0 : Math.max(5, Math.round((step.value / flowMaximum) * 100));
                return (
                  <div key={step.label} className="group grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary motion-safe:transition-transform motion-safe:duration-200 group-hover:scale-105">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-foreground">{index + 1}. {step.label}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <div
                          className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-700 motion-reduce:transition-none"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                    <span className="min-w-10 text-right font-heading text-lg font-bold tabular-nums text-foreground">{step.value}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60 motion-safe:transition-transform motion-safe:duration-300 hover:-translate-y-0.5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Conversion health</CardTitle>
              <CardDescription>Three rates that reveal where the buying journey is strongest.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 xl:grid-cols-1">
              {gauges.map((gauge) => {
                const degrees = Math.round((gauge.value / 100) * 360);
                return (
                  <div key={gauge.label} className="group flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-3 xl:flex-row xl:justify-between">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full p-1 motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-105"
                      style={{ background: `conic-gradient(hsl(var(--primary)) ${degrees}deg, hsl(var(--muted)) ${degrees}deg)` }}
                      role="img"
                      aria-label={`${gauge.label}: ${gauge.value}%`}
                    >
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                        <span className="text-sm font-bold tabular-nums text-foreground">{gauge.value}%</span>
                      </div>
                    </div>
                    <div className="min-w-0 text-center xl:text-right">
                      <p className="text-[11px] font-medium leading-4 text-muted-foreground">{gauge.label}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="analytics-detailed-shell">
        <StoreAnalyticsReportDetailed {...props} />
      </div>

      <style>{`
        .analytics-detailed-shell > div > div:first-child {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
