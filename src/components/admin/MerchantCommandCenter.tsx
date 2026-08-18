"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Eye,
  Mail,
  Package,
  PanelsTopLeft,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
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
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { buildPageBuilderPath, withStoreId } from "@/lib/admin-paths";
import { absoluteStoreUrl } from "@/lib/siteUrl";

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
  const { activeStoreId, role } = useAuth();
  const { data: productStatsData, isLoading: productLoading } = useStoreProductStats(activeStoreId);
  const { data: orderStatsData, isLoading: orderLoading } = useStoreOrderStats(activeStoreId);
  const { data: engagementStatsData, isLoading: engagementLoading } = useStoreEngagementStats(activeStoreId);
  const { data: pageStatsData, isLoading: pageLoading } = useStorePageStats(activeStoreId);
  const { data: storeHealthData, isLoading: healthLoading } = useStoreHealth(activeStoreId);

  const { data: storeMeta, isLoading: storeLoading } = useQuery({
    queryKey: ["merchant-command-center-store", activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return null;
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, slug, custom_domain")
        .eq("id", activeStoreId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(activeStoreId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const productStats = productStatsData ?? { total: 0, outOfStock: 0, featured: 0 };
  const orderStats = orderStatsData?.orderStats ?? { total: 0, revenue: 0, pending: 0 };
  const engagementStats = engagementStatsData ?? { unreadMessages: 0, pendingReviews: 0 };
  const pageStats = pageStatsData ?? { totalPages: 0, customPages: 0, visibleHomepageBlocks: 0 };
  const healthScore = storeHealthData?.score ?? 0;
  const isLoading = productLoading || orderLoading || engagementLoading || pageLoading || healthLoading || storeLoading;

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

  const previewUrl = storeMeta?.slug
    ? absoluteStoreUrl({ slug: storeMeta.slug, customDomain: storeMeta.custom_domain ?? null }, "/")
    : null;
  const nextAction = attentionItems[0] ?? null;
  const healthLabel = healthScore >= 90 ? "Strong" : healthScore >= 75 ? "Good" : healthScore >= 50 ? "Needs work" : "Not ready";

  if (isLoading) {
    return <Skeleton className="h-[340px] w-full rounded-3xl" />;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_38%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.08),transparent_36%)]" />
      <div className="relative grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="border-b border-border p-5 sm:p-7 xl:border-b-0 xl:border-r">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
                  <Zap className="mr-1 h-3 w-3" /> Command center
                </Badge>
                <Badge variant="secondary">{role === "admin" ? "Merchant owner workspace" : "Store workspace"}</Badge>
              </div>
              <h2 className="mt-4 font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {storeMeta?.name ? `${storeMeta.name} at a glance` : "Store operations at a glance"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                See what needs action first, then move into the detailed dashboard only when you need deeper analysis.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-background/75 px-4 py-3 backdrop-blur">
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(hsl(var(--primary)) ${Math.max(0, Math.min(100, healthScore)) * 3.6}deg, hsl(var(--muted)) 0deg)` }}
              >
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-card">
                  <span className="font-heading text-lg font-bold leading-none">{healthScore}</span>
                  <span className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">score</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Store health</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{healthLabel}</p>
                <Link to={withStoreId("/admin/launch", activeStoreId)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  View readiness <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Orders", value: orderStats.total, icon: ShoppingCart },
              { label: "Revenue", value: `৳${orderStats.revenue.toLocaleString()}`, icon: CircleDollarSign },
              { label: "Products", value: productStats.total, icon: Package },
              { label: "Inbox", value: engagementStats.unreadMessages, icon: Mail },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-background/65 p-3.5 backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 truncate font-heading text-xl font-bold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Priority queue</p>
                <p className="text-xs text-muted-foreground">Highest-impact actions are surfaced first.</p>
              </div>
              {attentionItems.length === 0 ? (
                <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Clear</Badge>
              ) : null}
            </div>

            <div className="mt-3 grid gap-2">
              {attentionItems.length > 0 ? attentionItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  className={cn(
                    "group flex items-start gap-3 rounded-2xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-sm",
                    attentionStyles[item.level],
                  )}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background/80">
                    {item.level === "urgent" ? <AlertTriangle className="h-4 w-4 text-destructive" /> : item.level === "attention" ? <Sparkles className="h-4 w-4 text-amber-600" /> : <Star className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1 self-center text-xs font-medium text-primary sm:inline-flex">
                    {item.action} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )) : (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Nothing urgent right now</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Your operational queue is clear. Review analytics or work on growth next.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col p-5 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Next best action</p>
            <h3 className="mt-2 font-heading text-xl font-bold text-foreground">
              {nextAction?.title ?? "Keep the store moving"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {nextAction?.detail ?? "Your critical queue is clear. Use the shortcuts below to manage the next part of the business."}
            </p>
            {nextAction ? (
              <Button asChild className="mt-4 w-full justify-between sm:w-auto">
                <Link to={nextAction.href}>
                  {nextAction.action}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="my-6 h-px bg-border" />

          <div>
            <p className="text-sm font-semibold text-foreground">Fast actions</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Button asChild variant="outline" className="h-auto justify-start gap-3 px-3 py-3 text-left">
                <Link to={withStoreId("/admin/products", activeStoreId)}>
                  <Package className="h-4 w-4 text-primary" />
                  <span><span className="block text-sm font-semibold">Products</span><span className="block text-[11px] font-normal text-muted-foreground">Catalog & stock</span></span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 px-3 py-3 text-left">
                <Link to={withStoreId("/admin/orders", activeStoreId)}>
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span><span className="block text-sm font-semibold">Orders</span><span className="block text-[11px] font-normal text-muted-foreground">Fulfillment queue</span></span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 px-3 py-3 text-left">
                <Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}>
                  <PanelsTopLeft className="h-4 w-4 text-primary" />
                  <span><span className="block text-sm font-semibold">Edit storefront</span><span className="block text-[11px] font-normal text-muted-foreground">Design & content</span></span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto justify-start gap-3 px-3 py-3 text-left">
                <Link to={withStoreId("/admin/customers", activeStoreId)}>
                  <Mail className="h-4 w-4 text-primary" />
                  <span><span className="block text-sm font-semibold">Customers</span><span className="block text-[11px] font-normal text-muted-foreground">Inbox & reviews</span></span>
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <div className="rounded-2xl border border-border bg-background/65 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Store className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{storeMeta?.name ?? "Current storefront"}</p>
                  <p className="truncate text-xs text-muted-foreground">{storeMeta?.custom_domain || (storeMeta?.slug ? `${storeMeta.slug} storefront` : "Storefront preview")}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}>
                    <Eye className="mr-2 h-3.5 w-3.5" /> Preview/edit
                  </Link>
                </Button>
                {previewUrl ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={previewUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-3.5 w-3.5" /> Live store
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> Live store
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
