"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Mail,
  Package,
  ShoppingCart,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { Link } from "@/lib/react-router-dom-shim";
import { useAuth } from "@/hooks/auth-context";
import {
  useStoreEngagementStats,
  useStoreHealth,
  useStoreOrderStats,
  useStorePageStats,
  useStoreProductStats,
} from "@/hooks/useDashboardQueries";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buildPageBuilderPath, withStoreId } from "@/lib/admin-paths";

type AttentionLevel = "urgent" | "attention" | "progress";

type AttentionItem = {
  id: string;
  level: AttentionLevel;
  title: string;
  detail: string;
  href: string;
  action: string;
};

const attentionStyles: Record<AttentionLevel, string> = {
  urgent: "border-destructive/25 bg-destructive/5",
  attention: "border-amber-500/25 bg-amber-500/5",
  progress: "border-primary/20 bg-primary/5",
};

export default function MerchantCommandCenter() {
  const { activeStoreId } = useAuth();
  const { data: productStatsData, isLoading: productLoading } = useStoreProductStats(activeStoreId);
  const { data: orderStatsData, isLoading: orderLoading } = useStoreOrderStats(activeStoreId);
  const { data: engagementStatsData, isLoading: engagementLoading } = useStoreEngagementStats(activeStoreId);
  const { data: pageStatsData, isLoading: pageLoading } = useStorePageStats(activeStoreId);
  const { data: storeHealthData, isLoading: healthLoading } = useStoreHealth(activeStoreId);

  const productStats = productStatsData ?? { total: 0, outOfStock: 0, featured: 0 };
  const orderStats = orderStatsData?.orderStats ?? { total: 0, revenue: 0, pending: 0 };
  const engagementStats = engagementStatsData ?? { unreadMessages: 0, pendingReviews: 0 };
  const pageStats = pageStatsData ?? { totalPages: 0, customPages: 0, visibleHomepageBlocks: 0 };
  const healthScore = storeHealthData?.score ?? 0;
  const isLoading = productLoading || orderLoading || engagementLoading || pageLoading || healthLoading;

  const attentionItems = useMemo<AttentionItem[]>(() => {
    if (!activeStoreId) return [];
    const items: AttentionItem[] = [];

    if (healthScore < 50) {
      items.push({
        id: "readiness-critical",
        level: "urgent",
        title: "Store is not launch-ready yet",
        detail: `Readiness is ${healthScore}/100. Finish the launch-critical setup before sending paid traffic.`,
        href: withStoreId("/admin/launch", activeStoreId),
        action: "Fix launch blockers",
      });
    } else if (healthScore < 85) {
      items.push({
        id: "readiness-progress",
        level: "progress",
        title: "A few launch refinements remain",
        detail: `Readiness is ${healthScore}/100. Complete the remaining checklist for a stronger storefront.`,
        href: withStoreId("/admin/launch", activeStoreId),
        action: "Continue setup",
      });
    }

    if (orderStats.pending > 0) {
      items.push({
        id: "pending-orders",
        level: orderStats.pending >= 5 ? "urgent" : "attention",
        title: `${orderStats.pending} order${orderStats.pending === 1 ? "" : "s"} need attention`,
        detail: "Review payment, confirmation, fulfillment, and courier status while the customer is still engaged.",
        href: withStoreId("/admin/orders", activeStoreId),
        action: "Process orders",
      });
    }

    if (productStats.outOfStock > 0) {
      items.push({
        id: "out-of-stock",
        level: "attention",
        title: `${productStats.outOfStock} product${productStats.outOfStock === 1 ? " is" : "s are"} out of stock`,
        detail: "Restock, hide, or update availability so customers do not hit dead ends.",
        href: withStoreId("/admin/products", activeStoreId),
        action: "Review inventory",
      });
    }

    if (engagementStats.unreadMessages > 0) {
      items.push({
        id: "messages",
        level: "attention",
        title: `${engagementStats.unreadMessages} unread customer message${engagementStats.unreadMessages === 1 ? "" : "s"}`,
        detail: "Fast replies improve trust and can recover purchase intent before it disappears.",
        href: withStoreId("/admin/messages", activeStoreId),
        action: "Open inbox",
      });
    }

    if (engagementStats.pendingReviews > 0) {
      items.push({
        id: "reviews",
        level: "progress",
        title: `${engagementStats.pendingReviews} review${engagementStats.pendingReviews === 1 ? "" : "s"} awaiting moderation`,
        detail: "Approve genuine customer feedback to strengthen storefront social proof.",
        href: withStoreId("/admin/reviews", activeStoreId),
        action: "Review feedback",
      });
    }

    if (productStats.total === 0) {
      items.push({
        id: "empty-catalog",
        level: "urgent",
        title: "Your catalog is still empty",
        detail: "Add the first product or listing so your storefront has something customers can act on.",
        href: withStoreId("/admin/products", activeStoreId),
        action: "Add first product",
      });
    }

    if (pageStats.visibleHomepageBlocks < 3) {
      items.push({
        id: "homepage-depth",
        level: "progress",
        title: "Homepage needs more selling context",
        detail: "Add trust, product, FAQ, or value sections so visitors understand the offer before checkout.",
        href: buildPageBuilderPath("basic", { storeId: activeStoreId }),
        action: "Improve homepage",
      });
    }

    const rank: Record<AttentionLevel, number> = { urgent: 0, attention: 1, progress: 2 };
    return items.sort((a, b) => rank[a.level] - rank[b.level]).slice(0, 4);
  }, [
    activeStoreId,
    engagementStats.pendingReviews,
    engagementStats.unreadMessages,
    healthScore,
    orderStats.pending,
    pageStats.visibleHomepageBlocks,
    productStats.outOfStock,
    productStats.total,
  ]);

  if (!activeStoreId) return null;

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full rounded-3xl" />;
  }

  const nextAction = attentionItems[0] ?? null;
  const remainingActions = attentionItems.slice(1);
  const healthLabel = healthScore >= 90 ? "Strong" : healthScore >= 75 ? "Good" : healthScore >= 50 ? "Needs work" : "Not ready";

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6" data-testid="merchant-command-center">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
            <Zap className="mr-1 h-3 w-3" /> Command center
          </Badge>
          <h2 className="mt-2 font-heading text-xl font-bold text-foreground sm:text-2xl">What needs your attention</h2>
        </div>
        <Link
          to={withStoreId("/admin/launch", activeStoreId)}
          className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-border bg-background/65 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:self-center"
        >
          Health <strong className="text-foreground">{healthScore}/100 · {healthLabel}</strong>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {nextAction ? (
        <div className={cn("mt-5 rounded-2xl border p-4 sm:p-5", attentionStyles[nextAction.level])}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Next action</p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-heading text-lg font-bold text-foreground sm:text-xl">{nextAction.title}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{nextAction.detail}</p>
            </div>
            <Button asChild className="shrink-0 justify-between sm:min-w-40">
              <Link to={nextAction.href}>
                {nextAction.action}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Nothing urgent right now</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Your operational queue is clear. Use Reports & tools when you want deeper analysis.</p>
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Orders", value: orderStats.total, icon: ShoppingCart },
          { label: "Revenue", value: `৳${orderStats.revenue.toLocaleString()}`, icon: CircleDollarSign },
          { label: "Products", value: productStats.total, icon: Package },
          { label: "Inbox", value: engagementStats.unreadMessages, icon: Mail },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-background/55 px-3 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <item.icon className="h-3.5 w-3.5 text-primary" />
              {item.label}
            </div>
            <p className="mt-1 truncate font-heading text-lg font-bold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {remainingActions.length > 0 ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Also on your radar</p>
            <span className="text-xs text-muted-foreground">{remainingActions.length} more</span>
          </div>
          <div className="mt-2 grid gap-2">
            {remainingActions.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  "group flex min-h-14 items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors hover:bg-secondary/40",
                  attentionStyles[item.level],
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background/80">
                  {item.level === "urgent" ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : item.level === "attention" ? (
                    <Sparkles className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Star className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="hidden truncate text-xs text-muted-foreground sm:block">{item.detail}</p>
                </div>
                <span className="hidden shrink-0 text-xs font-medium text-primary md:inline">{item.action}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
