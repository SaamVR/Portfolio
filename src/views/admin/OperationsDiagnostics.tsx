"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, HeartPulse, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/auth-context";
import { Link } from "@/lib/react-router-dom-shim";
import { withStoreId } from "@/lib/admin-paths";
import { buildDiagnosticsCards, loadMerchantOpsSnapshot, summarizeDomainIssue } from "@/lib/admin/merchant-ops";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function toneBadge(tone: "healthy" | "warning" | "failing") {
  if (tone === "healthy") return { label: "Healthy", variant: "default" as const };
  if (tone === "warning") return { label: "Needs attention", variant: "secondary" as const };
  return { label: "Failing", variant: "destructive" as const };
}

export default function OperationsDiagnosticsPage() {
  const { activeStoreId } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["operations-diagnostics", activeStoreId],
    enabled: Boolean(activeStoreId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => loadMerchantOpsSnapshot(activeStoreId as string),
  });

  if (!activeStoreId) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Operations diagnostics</CardTitle>
          <CardDescription>Select a store first to inspect domain, payment, billing, and day-to-day store health.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading diagnostics...
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle>Diagnostics unavailable</CardTitle>
          <CardDescription>We could not load store diagnostics right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const cards = buildDiagnosticsCards(data);
  const attentionCards = cards.filter((card) => card.tone !== "healthy");
  const activeDomain = data.domains.find((domain) => domain.status === "active" && domain.verified !== false && domain.misconfigured !== true) ?? null;
  const misconfiguredDomain = data.domains.find((domain) => domain.misconfigured || domain.status === "misconfigured") ?? null;
  const pendingOrders = data.orders.filter((order) => ["pending", "pending_payment", "processing"].includes(order.status ?? "")).length;
  const needsOpsFollowUp = pendingOrders + data.unreadMessages + data.pendingReviews;
  const paymentMethodsSeen = Array.from(new Set(
    data.orders
      .map((order) => order.payment_method?.trim())
      .filter((value): value is string => Boolean(value)),
  ));
  const recentFailedNotifications = data.notificationEvents.filter((event) => event.status === "failed").slice(0, 3);
  const cityCounts = new Map<string, number>();
  data.orders.forEach((order) => {
    const city = order.shipping_city?.trim();
    if (!city) return;
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  });
  const deliveryCityCount = cityCounts.size;
  const topDeliveryCity = [...cityCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
  const watchlistItems = [
    misconfiguredDomain
      ? {
          label: "Domain verification",
          detail: summarizeDomainIssue(misconfiguredDomain.last_vercel_error?.message, misconfiguredDomain.hostname),
          href: "/admin/site-settings?tab=domains",
        }
      : null,
    pendingOrders > 0
      ? {
          label: "Orders waiting on action",
          detail: `${pendingOrders} order${pendingOrders === 1 ? "" : "s"} still need merchant action.`,
          href: "/admin/orders",
        }
      : null,
    deliveryCityCount > 3
      ? {
          label: "Multi-city delivery pressure",
          detail: topDeliveryCity
            ? `${deliveryCityCount} cities are already appearing in recent orders. ${topDeliveryCity[0]} is currently leading demand.`
            : `${deliveryCityCount} cities are already appearing in recent orders.`,
          href: "/admin/site-settings?tab=delivery",
        }
      : null,
    recentFailedNotifications[0]
      ? {
          label: "Failed notifications",
          detail: recentFailedNotifications[0].error || "Recent delivery failures need a test send and a closer look.",
          href: "/admin/notifications",
        }
      : null,
    data.unreadMessages > 0
      ? {
          label: "Unread customer messages",
          detail: `${data.unreadMessages} customer message${data.unreadMessages === 1 ? "" : "s"} are still unread.`,
          href: "/admin/orders",
        }
      : null,
  ].filter((item): item is { label: string; detail: string; href: string } => Boolean(item));

  return (
    <div className="space-y-7">
      <Card className="border-border bg-card/50">
        <CardHeader className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <HeartPulse className="h-6 w-6 text-primary" />
              Domain, payment, and operator diagnostics
            </CardTitle>
            <CardDescription className="max-w-2xl">
              A quick read on what is healthy, what needs attention, and what could quietly hurt the merchant experience if left alone.
            </CardDescription>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 px-5 py-4 text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Needs attention</p>
            <p className="mt-1 font-heading text-4xl font-bold text-foreground">{attentionCards.length}</p>
            <p className="text-xs text-muted-foreground">out of {cards.length} key areas</p>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Domain state</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {misconfiguredDomain ? "Domain needs a fix" : activeDomain ? "Custom domain is live" : "Platform fallback only"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {misconfiguredDomain?.hostname ?? activeDomain?.hostname ?? "No active custom domain detected"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Orders waiting</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{pendingOrders} open order{pendingOrders === 1 ? "" : "s"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Orders still waiting for payment, confirmation, or processing.</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Support queue</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{needsOpsFollowUp} item{needsOpsFollowUp === 1 ? "" : "s"} need follow-up</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.unreadMessages} unread messages and {data.pendingReviews} pending reviews.</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment signal</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {paymentMethodsSeen.length > 0 ? paymentMethodsSeen.join(" · ") : "No payment activity yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Recent orders show which payment paths shoppers are actually using.</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card/50">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Delivery footprint</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {deliveryCityCount > 0
                ? `${deliveryCityCount} cit${deliveryCityCount === 1 ? "y" : "ies"} active`
                : "No city trend yet"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {topDeliveryCity
                ? `${topDeliveryCity[0]} is the strongest current destination.`
                : "Recent orders have not built a delivery-city pattern yet."}
            </p>
          </CardContent>
        </Card>
      </div>

      {attentionCards.length > 0 ? (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Attention now
            </CardTitle>
            <CardDescription>These are the fastest ways to reduce avoidable support pain.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {attentionCards.map((card) => (
              <div key={card.id} className="rounded-xl border border-border bg-background/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{card.label}</p>
                    <p className="text-sm text-muted-foreground">{card.summary}</p>
                    <p className="text-xs text-muted-foreground">{card.detail}</p>
                  </div>
                  <Link to={withStoreId(card.href, activeStoreId)} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle>Next action links</CardTitle>
          <CardDescription>Move directly from diagnostics into the screen that actually resolves the issue.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/admin/launch", label: "Launch readiness", detail: "Re-check blockers after each fix." },
            { href: "/admin/orders", label: "Orders", detail: "Clear operational backlog and booking issues." },
            { href: "/admin/couriers", label: "Couriers", detail: "Adjust provider setup and delivery coverage." },
            { href: "/admin/notifications", label: "Notifications", detail: "Confirm alerts, retries, and dead letters." },
          ].map((item) => (
            <Link key={item.href} to={withStoreId(item.href, activeStoreId)} className="rounded-xl border border-border bg-background/60 p-4 transition-colors hover:bg-secondary/60">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-7 xl:grid-cols-2">
        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Current watchlist</CardTitle>
            <CardDescription>The issues most likely to create merchant pain if they sit too long.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {watchlistItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                  <Link to={withStoreId(item.href, activeStoreId)} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
            {attentionCards.length === 0 && needsOpsFollowUp === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nothing urgent is showing up right now. This is the calm state we want before pushing more traffic.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader>
            <CardTitle>Recent notification failures</CardTitle>
            <CardDescription>Delivery issues are often the earliest sign that something important drifted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentFailedNotifications.length > 0 ? recentFailedNotifications.map((event) => (
              <div key={event.id} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{event.template_name || "Notification event"}</p>
                    <p className="text-xs text-muted-foreground">{event.channel || "email"} to {event.recipient || "unknown recipient"}</p>
                    <p className="pt-1 text-xs text-destructive">{event.error || "Unknown failure"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No recent failed notifications. That is a healthy sign.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-7 xl:grid-cols-2">
        {cards.map((card) => {
          const badge = toneBadge(card.tone);
          return (
            <Card key={card.id} className="border-border bg-card/50">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">{card.label}</CardTitle>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <CardDescription>{card.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{card.detail}</p>
                <Link to={withStoreId(card.href, activeStoreId)} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Open related area <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            What good looks like
          </CardTitle>
          <CardDescription>The store is easiest to support when these are all true at the same time.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {[
            "The platform link stays usable while custom-domain work is still propagating.",
            "A buyer can clearly pay, contact the merchant, or both without confusion.",
            "Billing and package access match what the merchant expects to use.",
            "Recent notification sends include at least one successful delivery path.",
          ].map((line) => (
            <div key={line} className="rounded-xl border border-border bg-background/60 p-4 text-sm text-foreground">
              {line}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
