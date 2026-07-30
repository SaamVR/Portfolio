"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Loader2, Rocket, ShieldCheck, ShoppingBag, Sparkles, Store, Workflow } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { Link } from "@/lib/react-router-dom-shim";
import { withStoreId } from "@/lib/admin-paths";
import { absoluteStoreUrl } from "@/lib/siteUrl";
import { buildLaunchReadinessSummary, isContactConfigured, isPaymentConfigured, loadMerchantOpsSnapshot, normalizeNotificationSettings } from "@/lib/admin/merchant-ops";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function toneClass(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 55) return "text-amber-600";
  return "text-destructive";
}

export default function LaunchReadinessPage() {
  const { activeStoreId } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["launch-readiness", activeStoreId],
    enabled: Boolean(activeStoreId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => loadMerchantOpsSnapshot(activeStoreId as string),
  });

  if (!activeStoreId) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Launch readiness</CardTitle>
          <CardDescription>Select a store first to review launch readiness.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking your launch readiness...
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>Launch readiness unavailable</CardTitle>
          <CardDescription>We could not load the launch checklist right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const readiness = buildLaunchReadinessSummary(data);
  const priorityItem = readiness.blockers[0] ?? readiness.warnings[0] ?? null;
  const notificationSettings = normalizeNotificationSettings(data.settings.notification_settings);
  const paymentConfigured = isPaymentConfigured(data.settings.payment_settings);
  const contactConfigured = isContactConfigured(data.settings.whatsapp_support, data.settings.contact_page);
  const previewUrl = data.store?.slug ? absoluteStoreUrl({ slug: data.store.slug, customDomain: data.store.custom_domain }, "/") : null;
  const recentOrders = data.orders.filter((order) => order.status !== "cancelled").length;
  const activeDomain = data.domains.find((domain) => domain.status === "active" && domain.verified !== false && domain.misconfigured !== true) ?? null;
  const hasSuccessfulNotification = data.notificationEvents.some((event) => event.status === "sent" || event.status === "delivered");

  return (
    <div className="space-y-7">
      <Card className="border-border bg-card/50">
        <CardHeader className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Rocket className="h-6 w-6 text-primary" />
              Launch readiness
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              A final merchant-facing check for anything that could hurt trust, sales, or support load before you push real traffic.
            </CardDescription>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 px-5 py-4 text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Readiness score</p>
            <p className={`mt-1 font-heading text-4xl font-bold ${toneClass(readiness.score)}`}>{readiness.score}</p>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Blockers</p>
            <p className="mt-2 font-heading text-3xl font-bold text-destructive">{readiness.blockers.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">These should be fixed before you start sending traffic.</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Needs attention</p>
            <p className="mt-2 font-heading text-3xl font-bold text-amber-600">{readiness.warnings.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">These upgrades make the store feel clearer and more trustworthy.</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Already done</p>
            <p className="mt-2 font-heading text-3xl font-bold text-emerald-600">{readiness.completed.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">These parts already look ready.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-4">
        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Launch URL</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{activeDomain?.hostname ?? data.store?.slug ?? "Missing"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeDomain ? "Your custom domain is already serving traffic." : data.store?.slug ? "Your platform storefront link is ready as the safe fallback." : "Your store link still needs attention."}
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Store className="h-5 w-5" />
              </div>
            </div>
            {previewUrl ? (
              <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Open storefront <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Buying path</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {paymentConfigured ? "Payments ready" : contactConfigured ? "Contact-led checkout only" : "Buying flow missing"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {paymentConfigured ? "Shoppers have a clear way to pay." : "Shoppers still need a clearer way to place an order."}
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <ShoppingBag className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Trust surface</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {data.store?.logo_url && readiness.customPageCount >= 1 ? "Brand + support pages present" : "Trust signals still thin"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {readiness.homepageVisibleBlocks} homepage sections and {readiness.customPageCount} support or policy page{readiness.customPageCount === 1 ? "" : "s"}.
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Operations</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {hasSuccessfulNotification ? "At least one alert path has worked recently" : "Notification proof is still pending"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recentOrders} recent order{recentOrders === 1 ? "" : "s"} and {data.notificationEvents.length} notification event{data.notificationEvents.length === 1 ? "" : "s"} in view.
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Workflow className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {priorityItem ? (
        <Card className={priorityItem.severity === "blocked" ? "border-destructive/30 bg-destructive/5" : "border-amber-500/20 bg-amber-500/5"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {priorityItem.severity === "blocked" ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Sparkles className="h-5 w-5 text-amber-600" />}
              Next best move
            </CardTitle>
            <CardDescription>
              {priorityItem.severity === "blocked"
                ? "If you only fix one thing next, this removes the biggest launch risk."
                : "There are no hard blockers left, so this is the refinement with the highest payoff."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{priorityItem.label}</p>
                <Badge variant={priorityItem.severity === "blocked" ? "destructive" : "secondary"}>
                  {priorityItem.severity === "blocked" ? "Blocker" : "Refine"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{priorityItem.action}</p>
              {priorityItem.detail ? <p className="mt-2 text-xs text-muted-foreground">{priorityItem.detail}</p> : null}
            </div>
            <Button asChild className="gap-2">
              <Link to={withStoreId(priorityItem.href, activeStoreId)}>
                    Open this fix <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Open next</CardTitle>
          <CardDescription>Jump straight into the next operational screen without hunting through the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/admin/diagnostics", label: "Diagnostics", detail: "Check domain, payment, and operator health." },
            { href: "/admin/orders", label: "Orders", detail: "Confirm the order queue is launch-safe." },
            { href: "/admin/couriers", label: "Couriers", detail: "Review delivery setup and booking readiness." },
            { href: "/admin/notifications", label: "Notifications", detail: "Review delivery history and capture a real receipt plus merchant-alert proof." },
          ].map((item) => (
            <Link key={item.href} to={withStoreId(item.href, activeStoreId)} className="rounded-xl border border-border bg-background/60 p-4 transition-colors hover:bg-secondary/60">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      {readiness.blockers.length > 0 ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Fix before launch
            </CardTitle>
            <CardDescription>These are the highest-leverage things to finish first.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {readiness.blockers.map((item) => (
              <div key={item.id} className="rounded-xl border border-destructive/20 bg-background/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <Badge variant="outline" className="border-destructive/30 text-destructive">Blocker</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.action}</p>
                    {item.detail ? <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p> : null}
                  </div>
                  <Button asChild className="gap-2 sm:self-center">
                    <Link to={withStoreId(item.href, activeStoreId)}>
                      Fix now <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-7 xl:grid-cols-2">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Refinements worth doing
            </CardTitle>
            <CardDescription>These are not blocking, but they make the launch feel stronger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {readiness.warnings.length > 0 ? readiness.warnings.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <Badge variant="secondary">Refine</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.action}</p>
                    {item.detail ? <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p> : null}
                  </div>
                  <Link to={withStoreId(item.href, activeStoreId)} className="text-sm font-medium text-primary hover:underline">
                    Open
                  </Link>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No major refinement warnings at the moment.</p>}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Ready already
            </CardTitle>
            <CardDescription>The pieces that already look healthy for launch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {readiness.completed.map((item) => (
              <div key={item.id} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    {item.detail ? <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p> : <p className="mt-1 text-xs text-muted-foreground">This part already looks good.</p>}
                  </div>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">Done</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Launch confidence details</CardTitle>
          <CardDescription>A quick read on the parts that usually create day-one friction.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Catalog depth</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{data.products.length} product{data.products.length === 1 ? "" : "s"} ready</p>
            <p className="mt-1 text-xs text-muted-foreground">Enough assortment to handle real traffic without an empty-store feel.</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Support coverage</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {contactConfigured ? "Buyers can reach the merchant" : "Support channel still missing"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Contact and reassurance matter almost as much as checkout on first launch.</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Alert channels</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {[notificationSettings.emailReceipts && "Receipts", notificationSettings.emailAlerts && "Merchant alerts", notificationSettings.smsEnabled && "SMS"]
                .filter(Boolean)
                .join(" · ") || "No live channels enabled"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Merchants notice problems faster when at least one delivery path is proven.</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Billing state</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{data.subscription?.status ?? "No blocking issue detected"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Entitlements should stay stable while the merchant is actively launching.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
