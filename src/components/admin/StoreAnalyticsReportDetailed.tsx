import { Search, ShoppingCart, Target, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsReportSummary, AnalyticsStoreSummary } from "@/lib/analytics/report";

function percentage(value?: number) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function formatMoney(value: number) {
  return `BDT ${value.toLocaleString()}`;
}

export default function StoreAnalyticsReport({
  title,
  description,
  report,
  previousReport,
  storeSummaries = [],
  storeSummaryTitle = "Store Breakdown",
  storeSummaryDescription = "Compare analytics performance across stores in the current scope.",
}: {
  title: string;
  description: string;
  report: AnalyticsReportSummary;
  previousReport?: AnalyticsReportSummary | null;
  storeSummaries?: AnalyticsStoreSummary[];
  storeSummaryTitle?: string;
  storeSummaryDescription?: string;
}) {
  const comparisonCards = previousReport ? [
    {
      label: "Visitors",
      current: report.visitors,
      previous: previousReport.visitors,
    },
    {
      label: "Searches",
      current: report.searches,
      previous: previousReport.searches,
    },
    {
      label: "Purchases",
      current: report.purchases,
      previous: previousReport.purchases,
    },
    {
      label: "Revenue",
      current: report.revenue,
      previous: previousReport.revenue,
      money: true,
    },
    {
      label: "Net sales",
      current: report.netSales,
      previous: previousReport.netSales,
      money: true,
    },
  ] : [];
  const actionItems = [
    report.zeroResultSearches[0]
      ? {
          title: "Shoppers are searching for products they cannot find",
          detail: `"${report.zeroResultSearches[0].label}" showed up ${report.zeroResultSearches[0].value} time${report.zeroResultSearches[0].value === 1 ? "" : "s"} with zero results.`,
          recommendation: "Add those products, improve tags, or create a landing page that answers that intent.",
        }
      : null,
    report.topProducts.find((product) => product.views >= 3 && product.purchases === 0)
      ? {
          title: "A product is getting attention but not closing",
          detail: `${report.topProducts.find((product) => product.views >= 3 && product.purchases === 0)?.label} is being viewed, but it still has no recorded purchases in this window.`,
          recommendation: "Review price clarity, trust copy, product images, and add-to-cart friction on that page first.",
        }
      : null,
    report.addToCart > 0 && report.checkoutStarts < report.addToCart
      ? {
          title: "Shoppers are dropping between cart and checkout",
          detail: `${report.addToCart} add-to-cart events turned into ${report.checkoutStarts} checkout starts.`,
          recommendation: "Check cart clarity, delivery messaging, and any surprise steps before checkout begins.",
        }
      : null,
    report.checkoutStarts > 0 && report.purchases < report.checkoutStarts
      ? {
          title: "Checkout is leaking before purchase",
          detail: `${report.checkoutStarts} checkout starts became ${report.purchases} completed purchase${report.purchases === 1 ? "" : "s"}.`,
          recommendation: "Test the checkout flow, payment instructions, and confirmation messages end to end.",
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; detail: string; recommendation: string }>;

  return (
    <div className="space-y-9">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Visitors", value: report.visitors, icon: Users },
          { label: "Sessions", value: report.sessions, icon: TrendingUp },
          { label: "Searches", value: report.searches, icon: Search },
          { label: "Add to Cart", value: report.addToCart, icon: ShoppingCart },
          { label: "Revenue", value: formatMoney(report.revenue), icon: Target },
          { label: "Net sales", value: formatMoney(report.netSales), icon: Target },
          { label: "Refunded", value: formatMoney(report.refundedAmount), icon: Target },
          { label: "Repeat customers", value: report.repeatCustomers, icon: Users },
        ].map((item) => (
          <Card key={item.label} className="border-border bg-card/50">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="mt-2 font-heading text-2xl font-bold text-foreground">{item.value}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Average order value", value: formatMoney(report.averageOrderValue) },
          { label: "Visitor to purchase", value: percentage(report.visitorToPurchaseRate) },
          { label: "Cart to checkout", value: percentage(report.cartToCheckoutRate) },
          { label: "Checkout completion", value: percentage(report.checkoutCompletionRate) },
        ].map((item) => (
          <Card key={item.label} className="border-border bg-card/50">
            <CardContent className="p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-2 font-heading text-2xl font-bold text-foreground">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {comparisonCards.length > 0 ? (
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Compared with previous period</CardTitle>
            <CardDescription>A quick directional read against the matching period right before this one.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {comparisonCards.map((item) => {
              const delta = item.current - item.previous;
              const positive = delta >= 0;
              return (
                <div key={item.label} className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-2 font-heading text-2xl font-bold text-foreground">
                    {item.money ? formatMoney(item.current) : item.current}
                  </p>
                  <p className={`mt-1 text-xs ${positive ? "text-emerald-600" : "text-destructive"}`}>
                    {positive ? "+" : ""}{item.money ? formatMoney(delta) : delta} vs previous
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Previous: {item.money ? formatMoney(item.previous) : item.previous}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {actionItems.length > 0 ? (
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>What to act on next</CardTitle>
            <CardDescription>These are the clearest signals for what deserves attention next.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-3">
            {actionItems.slice(0, 3).map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                <p className="mt-3 text-sm font-medium text-foreground">{item.recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-7 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-border bg-card/50">
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>See where shoppers are moving forward and where they are dropping away.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-5">
            {report.funnel.map((step, index) => (
              <div key={step.label} className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{index + 1}. {step.label}</p>
                <p className="mt-2 font-heading text-2xl font-bold text-foreground">{step.value}</p>
                {typeof step.rate === "number" ? <p className="mt-1 text-xs text-muted-foreground">{percentage(step.rate)} from the previous step</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Storefront Signals</CardTitle>
            <CardDescription>A quick summary of shopper behavior in the current reporting window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Page views</span><span className="font-medium text-foreground">{report.pageViews}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Product views</span><span className="font-medium text-foreground">{report.productViews}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Wishlist adds</span><span className="font-medium text-foreground">{report.wishlistAdds}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Checkout starts</span><span className="font-medium text-foreground">{report.checkoutStarts}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Purchases</span><span className="font-medium text-foreground">{report.purchases}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-7 xl:grid-cols-2">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Channel Profitability</CardTitle>
            <CardDescription>Which acquisition channels are actually creating confirmed net sales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.topProfitableChannels.length > 0 ? report.topProfitableChannels.map((channel) => (
              <div key={channel.label} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 text-sm">
                <span className="text-foreground">{channel.label}</span>
                <Badge variant="secondary">{formatMoney(channel.value)}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground">Confirmed revenue by channel will appear here once purchases are attributed.</p>}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Top Traffic Sources</CardTitle>
            <CardDescription>Which channels are sending visitors into the storefront.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.topSources.length > 0 ? report.topSources.map((source) => (
              <div key={source.label} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 text-sm">
                <span className="text-foreground">{source.label}</span>
                <Badge variant="secondary">{source.value}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground">No source data yet.</p>}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Top Mediums</CardTitle>
            <CardDescription>How traffic is being delivered into the storefront.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.topMediums.length > 0 ? report.topMediums.map((medium) => (
              <div key={medium.label} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-foreground"><TrendingUp className="h-4 w-4 text-muted-foreground" /> {medium.label}</span>
                <Badge variant="secondary">{medium.value}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground">No traffic-medium data yet.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-7 xl:grid-cols-2">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Top Campaigns</CardTitle>
            <CardDescription>Campaign labels that are actually attracting store traffic.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.topCampaigns.length > 0 ? report.topCampaigns.map((campaign) => (
              <div key={campaign.label} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 text-sm">
                <span className="truncate text-foreground">{campaign.label}</span>
                <Badge variant="secondary">{campaign.value}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground">No campaign tagging data yet.</p>}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Top Searches</CardTitle>
            <CardDescription>What shoppers are actively trying to find.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.topSearches.length > 0 ? report.topSearches.map((search) => (
              <div key={search.label} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-foreground"><Search className="h-4 w-4 text-muted-foreground" /> {search.label}</span>
                <Badge variant="secondary">{search.value}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground">No storefront searches yet.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-7 xl:grid-cols-2">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Zero-Result Searches</CardTitle>
            <CardDescription>Search terms shoppers used without finding results. These are strong merchandising clues.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.zeroResultSearches.length > 0 ? report.zeroResultSearches.map((search) => (
              <div key={search.label} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 text-sm">
                <span className="text-foreground">{search.label}</span>
                <Badge variant="outline">{search.value}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground">No zero-result searches in the current window.</p>}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Most Visited Pages</CardTitle>
            <CardDescription>Pages drawing the most storefront attention right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.topPages.length > 0 ? report.topPages.map((page) => (
              <div key={page.label} className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3 text-sm">
                <span className="truncate text-foreground">{page.label}</span>
                <Badge variant="secondary">{page.value}</Badge>
              </div>
            )) : <p className="text-sm text-muted-foreground">No page activity yet.</p>}
          </CardContent>
        </Card>
      </div>

      {storeSummaries.length > 0 ? (
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>{storeSummaryTitle}</CardTitle>
            <CardDescription>{storeSummaryDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {storeSummaries.map((store) => (
              <div key={store.storeId} className="grid gap-3 rounded-xl border border-border bg-background/50 p-4 md:grid-cols-[minmax(0,1.3fr)_repeat(6,minmax(0,110px))] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{store.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{store.storeId}</p>
                </div>
                <div><p className="text-xs text-muted-foreground">Visitors</p><p className="font-medium text-foreground">{store.visitors}</p></div>
                <div><p className="text-xs text-muted-foreground">Searches</p><p className="font-medium text-foreground">{store.searches}</p></div>
                <div><p className="text-xs text-muted-foreground">Carts</p><p className="font-medium text-foreground">{store.addToCart}</p></div>
                <div><p className="text-xs text-muted-foreground">Checkout</p><p className="font-medium text-foreground">{store.checkoutStarts}</p></div>
                <div><p className="text-xs text-muted-foreground">Purchases</p><p className="font-medium text-foreground">{store.purchases}</p></div>
                <div><p className="text-xs text-muted-foreground">Revenue</p><p className="font-medium text-foreground">{formatMoney(store.revenue)}</p></div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
          <CardDescription>Compare product interest against cart and purchase behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.topProducts.length > 0 ? report.topProducts.map((product) => (
            <div key={product.productId} className="grid gap-3 rounded-xl border border-border bg-background/50 p-4 md:grid-cols-[minmax(0,1fr)_repeat(6,minmax(0,120px))] md:items-center">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{product.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{product.productId}</p>
              </div>
              <div><p className="text-xs text-muted-foreground">Views</p><p className="font-medium text-foreground">{product.views}</p></div>
              <div><p className="text-xs text-muted-foreground">Carts</p><p className="font-medium text-foreground">{product.carts}</p></div>
              <div><p className="text-xs text-muted-foreground">Wishlists</p><p className="font-medium text-foreground">{product.wishlists}</p></div>
              <div><p className="text-xs text-muted-foreground">Purchased</p><p className="font-medium text-foreground">{product.purchases}</p></div>
              <div><p className="text-xs text-muted-foreground">Conversion</p><p className="font-medium text-foreground">{percentage(product.conversionRate)}</p></div>
              <div><p className="text-xs text-muted-foreground">Revenue</p><p className="font-medium text-foreground">{formatMoney(product.revenue)}</p></div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No product-level activity yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
