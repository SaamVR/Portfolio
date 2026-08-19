"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, BookOpen, Eye, Loader2, MousePointerClick, ShoppingBag, ShoppingCart, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

type BlogPostSummary = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
};

type AnalyticsEvent = {
  event_name: string;
  page_path: string | null;
  page_type: string | null;
  traffic_source: string | null;
  traffic_medium: string | null;
  traffic_campaign: string | null;
  value: number | null;
  event_timestamp: string;
};

type RevenueEvent = {
  event_type: string;
  net_amount: number | null;
  attribution_source: string | null;
  attribution_medium: string | null;
  attribution_campaign: string | null;
  event_timestamp: string;
};

type ArticlePerformance = BlogPostSummary & {
  views: number;
  ctaClicks: number;
  productViews: number;
  carts: number;
  checkouts: number;
  orders: number;
  revenue: number;
};

const rangeOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

function money(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function matchesBlogArticlePath(pagePath: string | null, slug: string) {
  if (!pagePath) return false;
  const path = pagePath.split("?")[0]?.replace(/\/$/, "") ?? "";
  return path.endsWith(`/blog/${slug}`);
}

function isBlogAttributed(event: Pick<AnalyticsEvent, "traffic_source" | "traffic_medium" | "traffic_campaign">, slug: string) {
  return event.traffic_source === "blog"
    && event.traffic_medium === "editorial"
    && event.traffic_campaign === slug;
}

function isBlogRevenueAttributed(event: RevenueEvent, slug: string) {
  return event.attribution_source === "blog"
    && event.attribution_medium === "editorial"
    && event.attribution_campaign === slug;
}

export default function BlogPerformance() {
  const { activeStoreId } = useAuth();
  const [rangeDays, setRangeDays] = useState("30");
  const sinceIso = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - Number(rangeDays));
    return date.toISOString();
  }, [rangeDays]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["blog-performance", activeStoreId, rangeDays],
    enabled: Boolean(activeStoreId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [postsResult, analyticsResult, revenueResult] = await Promise.all([
        (supabase as any)
          .from("blog_posts")
          .select("id,title,slug,status,published_at")
          .eq("store_id", activeStoreId as string)
          .order("published_at", { ascending: false, nullsFirst: false }),
        (supabase as any)
          .from("store_analytics_events")
          .select("event_name,page_path,page_type,traffic_source,traffic_medium,traffic_campaign,value,event_timestamp")
          .eq("store_id", activeStoreId as string)
          .gte("event_timestamp", sinceIso)
          .in("event_name", ["page_view", "blog_cta_click", "view_item", "add_to_cart", "begin_checkout", "purchase"])
          .order("event_timestamp", { ascending: false })
          .limit(10000),
        (supabase as any)
          .from("store_revenue_events")
          .select("event_type,net_amount,attribution_source,attribution_medium,attribution_campaign,event_timestamp")
          .eq("store_id", activeStoreId as string)
          .gte("event_timestamp", sinceIso)
          .order("event_timestamp", { ascending: false })
          .limit(5000),
      ]);

      if (postsResult.error) throw postsResult.error;
      if (analyticsResult.error) throw analyticsResult.error;
      if (revenueResult.error) throw revenueResult.error;

      return {
        posts: (postsResult.data ?? []) as BlogPostSummary[],
        analytics: (analyticsResult.data ?? []) as AnalyticsEvent[],
        revenue: (revenueResult.data ?? []) as RevenueEvent[],
      };
    },
  });

  const rows = useMemo<ArticlePerformance[]>(() => {
    const posts = data?.posts ?? [];
    const analytics = data?.analytics ?? [];
    const revenue = data?.revenue ?? [];

    return posts.map((post) => {
      const attributed = analytics.filter((event) => isBlogAttributed(event, post.slug));
      const revenueEvents = revenue.filter((event) => isBlogRevenueAttributed(event, post.slug));
      return {
        ...post,
        views: analytics.filter((event) => event.event_name === "page_view" && event.page_type === "blog_article" && matchesBlogArticlePath(event.page_path, post.slug)).length,
        ctaClicks: attributed.filter((event) => event.event_name === "blog_cta_click").length,
        productViews: attributed.filter((event) => event.event_name === "view_item").length,
        carts: attributed.filter((event) => event.event_name === "add_to_cart").length,
        checkouts: attributed.filter((event) => event.event_name === "begin_checkout").length,
        orders: revenueEvents.filter((event) => event.event_type === "sale").length,
        revenue: revenueEvents.reduce((sum, event) => sum + Number(event.net_amount || 0), 0),
      };
    }).sort((a, b) => b.revenue - a.revenue || b.views - a.views);
  }, [data]);

  const totals = useMemo(() => rows.reduce(
    (summary, row) => ({
      views: summary.views + row.views,
      ctaClicks: summary.ctaClicks + row.ctaClicks,
      productViews: summary.productViews + row.productViews,
      carts: summary.carts + row.carts,
      orders: summary.orders + row.orders,
      revenue: summary.revenue + row.revenue,
    }),
    { views: 0, ctaClicks: 0, productViews: 0, carts: 0, orders: 0, revenue: 0 },
  ), [rows]);

  if (!activeStoreId) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Blog performance</CardTitle>
          <CardDescription>Select a store first to see article traffic and attributed sales.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading Blog performance...</div>;
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>Blog performance unavailable</CardTitle>
          <CardDescription>Analytics data could not be loaded for this store right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-3xl font-bold text-foreground">Blog performance</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            See which articles attract readers, generate CTA engagement, move shoppers into products, and contribute to revenue through the existing storefront attribution pipeline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={rangeDays} onValueChange={setRangeDays}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" asChild><a href="/admin/blog"><ArrowLeft className="mr-2 h-4 w-4" /> Blog editor</a></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: "Article views", value: totals.views.toLocaleString(), icon: Eye },
          { label: "CTA clicks", value: totals.ctaClicks.toLocaleString(), icon: MousePointerClick },
          { label: "Product visits", value: totals.productViews.toLocaleString(), icon: ShoppingBag },
          { label: "Add to carts", value: totals.carts.toLocaleString(), icon: ShoppingCart },
          { label: "Attributed orders", value: totals.orders.toLocaleString(), icon: WalletCards },
          { label: "Attributed revenue", value: money(totals.revenue), icon: BarChart3 },
        ].map((item) => (
          <Card key={item.label} className="border-border bg-card/50">
            <CardHeader className="space-y-2 p-5">
              <div className="flex items-center justify-between gap-2">
                <CardDescription>{item.label}</CardDescription>
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-2xl">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {rows.length === 0 ? (
        <AdminEmptyState
          icon={BookOpen}
          title="No Blog posts to measure"
          description="Create and publish an article first. Performance will appear here as shoppers read and click through to products or article calls to action."
          actions={[{ label: "Open Blog editor", href: "/admin/blog" }]}
        />
      ) : (
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Article performance</CardTitle>
            <CardDescription>CTA clicks and downstream commerce are tied to the article slug through the existing Blog editorial attribution convention.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Article</th>
                  <th className="px-3 py-3 text-right font-medium">Views</th>
                  <th className="px-3 py-3 text-right font-medium">CTA clicks</th>
                  <th className="px-3 py-3 text-right font-medium">CTA CTR</th>
                  <th className="px-3 py-3 text-right font-medium">Product visits</th>
                  <th className="px-3 py-3 text-right font-medium">Product CTR</th>
                  <th className="px-3 py-3 text-right font-medium">Carts</th>
                  <th className="px-3 py-3 text-right font-medium">Orders</th>
                  <th className="py-3 pl-3 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="py-4 pr-4">
                      <p className="max-w-md font-semibold text-foreground">{row.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">/{row.slug} · {row.status}</p>
                    </td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.views.toLocaleString()}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.ctaClicks.toLocaleString()}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{percent(row.ctaClicks, row.views)}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.productViews.toLocaleString()}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{percent(row.productViews, row.views)}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.carts.toLocaleString()}</td>
                    <td className="px-3 py-4 text-right tabular-nums">{row.orders.toLocaleString()}</td>
                    <td className="py-4 pl-3 text-right font-semibold tabular-nums">{money(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>How to read this report</CardTitle>
          <CardDescription>Article views measure readership. CTA clicks, product visits, carts, and attributed sales only count Blog editorial journeys, so ordinary store browsing does not inflate Blog performance.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-background/60 p-4"><p className="text-sm font-semibold">High views, low CTA or product CTR</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Improve CTA relevance, product placement, comparison clarity, or the next-step promise inside the article.</p></div>
          <div className="rounded-xl border border-border bg-background/60 p-4"><p className="text-sm font-semibold">High clicks, low carts</p><p className="mt-1 text-xs leading-5 text-muted-foreground">The article is creating intent, but product value, price, stock, or landing-page clarity may be weak.</p></div>
          <div className="rounded-xl border border-border bg-background/60 p-4"><p className="text-sm font-semibold">Revenue-producing articles</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Refresh and internally link these pieces first; they have demonstrated commercial value rather than traffic alone.</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
