"use client";

import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  DollarSign,
  Layers,
  PieChart,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  monthly_price?: number | null;
}

interface StoreSummary {
  id: string;
  name: string;
  planId?: string | null;
  subscriptionStatus: string;
  revenue: number;
}

interface InvoiceRow {
  id: string;
  store_id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at?: string;
}

interface PlatformFinancialMetricsCardProps {
  plans: Plan[];
  storeSummaries: StoreSummary[];
  invoices: InvoiceRow[];
}

export function PlatformFinancialMetricsCard({
  plans,
  storeSummaries,
  invoices,
}: PlatformFinancialMetricsCardProps) {
  const financialStats = useMemo(() => {
    const planPriceMap = new Map<string, number>();
    plans.forEach((p) => {
      if (p.monthly_price != null) {
        planPriceMap.set(p.id, Number(p.monthly_price));
      }
    });

    const activePaidStores = storeSummaries.filter(
      (s) => s.subscriptionStatus === "active" && (planPriceMap.get(s.planId || "") || 0) > 0
    );

    const totalStoresCount = storeSummaries.length;
    const paidStoresCount = activePaidStores.length;
    const freeStoresCount = storeSummaries.filter(
      (s) => !s.planId || s.planId === "free" || (planPriceMap.get(s.planId || "") || 0) === 0
    ).length;

    // Calculate MRR
    let mrr = 0;
    activePaidStores.forEach((s) => {
      const price = planPriceMap.get(s.planId || "") || 0;
      mrr += price;
    });

    const arr = mrr * 12;
    const arpu = paidStoresCount > 0 ? Math.round(mrr / paidStoresCount) : 0;

    // Calculate churn
    const pastPaidStores = storeSummaries.filter(
      (s) => ["past_due", "canceled", "unpaid"].includes(s.subscriptionStatus)
    ).length;

    const churnRate = totalStoresCount > 0
      ? Number(((pastPaidStores / Math.max(1, paidStoresCount + pastPaidStores)) * 100).toFixed(1))
      : 0;

    const estimatedLtv = churnRate > 0 ? Math.round(arpu / (churnRate / 100)) : arpu * 24;

    // Pending manual bKash funds
    const pendingInvoices = invoices.filter((i) => i.status === "pending");
    const pendingVolume = pendingInvoices.reduce((acc, i) => acc + Number(i.amount || 0), 0);

    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const totalCollectedLedger = paidInvoices.reduce((acc, i) => acc + Number(i.amount || 0), 0);

    // Revenue by plan tier
    const revenueByTier: Array<{ planId: string; planName: string; count: number; mrr: number; percentage: number }> = [];

    plans.forEach((plan) => {
      const price = Number(plan.monthly_price || 0);
      const matchingStores = storeSummaries.filter(
        (s) => s.planId === plan.id && s.subscriptionStatus === "active"
      );
      const tierMrr = matchingStores.length * price;
      revenueByTier.push({
        planId: plan.id,
        planName: plan.name,
        count: matchingStores.length,
        mrr: tierMrr,
        percentage: mrr > 0 ? Math.round((tierMrr / mrr) * 100) : 0,
      });
    });

    // Payment methods breakdown
    const paymentMethodsMap = new Map<string, { count: number; volume: number }>();
    paidInvoices.forEach((inv) => {
      const method = inv.payment_method || "manual_override";
      const existing = paymentMethodsMap.get(method) || { count: 0, volume: 0 };
      paymentMethodsMap.set(method, {
        count: existing.count + 1,
        volume: existing.volume + Number(inv.amount || 0),
      });
    });

    return {
      mrr,
      arr,
      arpu,
      churnRate,
      estimatedLtv,
      paidStoresCount,
      freeStoresCount,
      totalStoresCount,
      pendingVolume,
      pendingCount: pendingInvoices.length,
      totalCollectedLedger,
      revenueByTier,
      paymentMethods: Array.from(paymentMethodsMap.entries()).map(([method, data]) => ({
        method,
        ...data,
      })),
    };
  }, [invoices, plans, storeSummaries]);

  const formatBdt = (amount: number) => `BDT ${amount.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Primary KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-border bg-card/60 transition-all hover:border-primary/30 shadow-2xs">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly Recurring (MRR)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-foreground">
              {formatBdt(financialStats.mrr)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Annualized (ARR): <strong className="text-foreground">{formatBdt(financialStats.arr)}</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border bg-card/60 transition-all hover:border-primary/30 shadow-2xs">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              ARPU (Avg / Merchant)
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-foreground">
              {formatBdt(financialStats.arpu)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Across <strong className="text-foreground">{financialStats.paidStoresCount}</strong> active paid accounts
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border bg-card/60 transition-all hover:border-primary/30 shadow-2xs">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Est. Lifetime Value (LTV)
            </CardTitle>
            <Wallet className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-foreground">
              {formatBdt(financialStats.estimatedLtv)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Net Churn Rate: <strong className="text-foreground">{financialStats.churnRate}%</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border bg-card/60 transition-all hover:border-primary/30 shadow-2xs">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Manual Volume
            </CardTitle>
            <Receipt className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-bold text-foreground">
              {formatBdt(financialStats.pendingVolume)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              <strong className="text-foreground">{financialStats.pendingCount}</strong> pending bKash invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Revenue Breakdown & Payment Method Aggregation */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> MRR Distribution By Subscription Plan
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of recurring platform revenue across subscription tiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {financialStats.revenueByTier.map((tier) => (
              <div key={tier.planId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{tier.planName}</span>
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                      {tier.count} stores
                    </Badge>
                  </div>
                  <span className="font-bold text-foreground">{formatBdt(tier.mrr)}/mo ({tier.percentage}%)</span>
                </div>
                <Progress value={tier.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Payment Method Volume & Conversion
            </CardTitle>
            <CardDescription className="text-xs">
              Processed platform invoices aggregated by payment channel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total Historical Invoiced Revenue:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatBdt(financialStats.totalCollectedLedger)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {financialStats.paymentMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">
                  No settled invoice payments recorded yet.
                </p>
              ) : (
                financialStats.paymentMethods.map((pm) => (
                  <div
                    key={pm.method}
                    className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground capitalize">
                        {pm.method.replace("_", " ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{pm.count} paid transaction{pm.count === 1 ? "" : "s"}</p>
                    </div>
                    <Badge variant="secondary" className="font-bold">
                      {formatBdt(pm.volume)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
