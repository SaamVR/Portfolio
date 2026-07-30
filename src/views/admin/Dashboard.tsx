import { useEffect, useState } from "react";
import { Link, useSearchParams } from "@/lib/react-router-dom-shim";
import { buildPageBuilderPath, withStoreId } from "@/lib/admin-paths";
import { useAuth } from "@/hooks/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  CreditCard,
  X,
  FileText,
  Mail,
  MessageSquare,
  PanelsTopLeft,
  WandSparkles,
  Eye,
  Settings2,
  HardDriveDownload,
  Calendar,
  BarChart2,
  Activity,
  Zap,
} from "lucide-react";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import StoreActivityTimeline from "@/components/admin/StoreActivityTimeline";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import LaunchReadinessPage from "@/views/admin/LaunchReadiness";
import {
  useStoreProductStats,
  useStoreOrderStats,
  useStoreEngagementStats,
  useStorePageStats,
  useStoreHealth,
  useStorePlanNotice,
  useStoreAnalytics,
  useDashboardRealtime,
  type AnalyticsTimeRange,
} from "@/hooks/useDashboardQueries";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  pending_payment: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  processing: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  delivered: "bg-green-500/10 text-green-600 border-green-500/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const CHART_COLORS = ["hsl(145, 63%, 42%)", "hsl(220, 80%, 50%)", "hsl(40, 80%, 50%)", "hsl(0, 72%, 51%)"];

const DATE_RANGE_OPTIONS: { label: string; value: AnalyticsTimeRange }[] = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
];

const Dashboard = () => {
  const { role, activeStoreId } = useAuth();
  const { data: entitlementData } = useStoreEntitlements(activeStoreId);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<AnalyticsTimeRange>("30d");
  const [trialPlanDismissed, setTrialPlanDismissed] = useState(false);
  const [setupCoachDismissed, setSetupCoachDismissed] = useState(false);

  // Activate real-time Supabase subscriptions for orders, messages, and reviews
  useDashboardRealtime(activeStoreId);

  // React Query hooks running concurrently for fast parallel loading & skeletons
  const { data: productStatsData, isLoading: productStatsLoading } = useStoreProductStats(activeStoreId);
  const { data: orderStatsData, isLoading: orderStatsLoading } = useStoreOrderStats(activeStoreId);
  const { data: engagementStatsData, isLoading: engagementStatsLoading } = useStoreEngagementStats(activeStoreId);
  const { data: pageStatsData, isLoading: pageStatsLoading } = useStorePageStats(activeStoreId);
  const { data: storeHealthData, isLoading: healthLoading } = useStoreHealth(activeStoreId);
  const { data: planNoticeData, isLoading: planNoticeLoading } = useStorePlanNotice(activeStoreId);
  const { data: analyticsData, isLoading: analyticsLoading } = useStoreAnalytics(activeStoreId, analyticsTimeRange);

  const productStats = productStatsData ?? { total: 0, outOfStock: 0, featured: 0 };
  const orderStats = orderStatsData?.orderStats ?? { total: 0, revenue: 0, pending: 0 };
  const recentOrders = orderStatsData?.recentOrders ?? [];
  const chartData = orderStatsData?.chartData ?? [];
  const statusData = orderStatsData?.statusData ?? [];
  const engagementStats = engagementStatsData ?? { unreadMessages: 0, pendingReviews: 0 };
  const pageStats = pageStatsData ?? { totalPages: 0, customPages: 0, visibleHomepageBlocks: 0 };
  const storeHealth = storeHealthData ?? { score: 0, items: [] };
  const planNotice = planNoticeData ?? null;
  const storefrontAnalytics = analyticsData?.analytics ?? {
    visitors: 0,
    sessions: 0,
    pageViews: 0,
    productViews: 0,
    addToCart: 0,
    wishlistAdds: 0,
    checkoutStarts: 0,
    purchases: 0,
  };
  const topSources = analyticsData?.topSources ?? [];
  const topSearches = analyticsData?.topSearches ?? [];

  useEffect(() => {
    if (!activeStoreId || typeof window === "undefined") return;
    setTrialPlanDismissed(window.localStorage.getItem(`dashboard-trial-plan-dismissed:${activeStoreId}`) === "true");
    setSetupCoachDismissed(window.localStorage.getItem(`dashboard-setup-coach-dismissed:${activeStoreId}`) === "true");
  }, [activeStoreId]);

  const dismissTrialPlanNotice = () => {
    setTrialPlanDismissed(true);
    if (activeStoreId && typeof window !== "undefined") {
      window.localStorage.setItem(`dashboard-trial-plan-dismissed:${activeStoreId}`, "true");
    }
  };

  const dismissSetupCoach = () => {
    setSetupCoachDismissed(true);
    if (activeStoreId && typeof window !== "undefined") {
      window.localStorage.setItem(`dashboard-setup-coach-dismissed:${activeStoreId}`, "true");
    }
  };

  const setupWizardSteps = [
    {
      id: "onboarding",
      label: "Complete onboarding review",
      done: storeHealth.score >= 20,
      href: `/admin/onboarding?storeId=${encodeURIComponent(activeStoreId ?? "")}`,
      action: "Review your store basics, launch copy, and guided setup progress.",
      cta: "Open guided setup",
      icon: WandSparkles,
    },
    {
      id: "content",
      label: "Polish homepage content",
      done: pageStats.visibleHomepageBlocks >= 3,
      href: buildPageBuilderPath("basic", { storeId: activeStoreId }),
      action: "Guide shoppers through hero, trust, FAQ, and key selling sections.",
      cta: "Edit storefront",
      icon: PanelsTopLeft,
    },
    {
      id: "settings",
      label: "Finish payments and contact",
      done: storeHealth.items.filter((item) => item.label === "Payment method configured" || item.label === "Customer contact is configured").every((item) => item.done),
      href: withStoreId("/admin/site-settings?tab=payment", activeStoreId),
      action: "Set how buyers pay and how they can reach you.",
      cta: "Open Site Settings",
      icon: Settings2,
    },
    {
      id: "launch",
      label: "Preview and publish",
      done: storeHealth.items.find((item) => item.label === "Store is published")?.done ?? false,
      href: buildPageBuilderPath("basic", { storeId: activeStoreId }),
      action: "Preview the storefront, then publish when the setup feels trustworthy.",
      cta: "Preview before launch",
      icon: Eye,
    },
  ];
  const nextWizardStep = setupWizardSteps.find((step) => !step.done) ?? null;
  const merchantWorkspaces = [
    {
      label: "Edit storefront",
      description: "Update homepage sections, hero content, and selling blocks without digging through technical settings.",
      to: buildPageBuilderPath("basic", { storeId: activeStoreId }),
      icon: PanelsTopLeft,
      show: role === "admin",
    },
    {
      label: "Store profile",
      description: "Manage branding, contact details, business info, and key site identity settings.",
      to: withStoreId("/admin/site-settings", activeStoreId),
      icon: Settings2,
      show: role === "admin",
    },
    {
      label: "Payments and checkout",
      description: "Set payment methods, delivery expectations, and launch-critical purchase settings.",
      to: withStoreId("/admin/site-settings?tab=payment", activeStoreId),
      icon: CreditCard,
      show: role === "admin",
    },
  ].filter((workspace) => workspace.show);

  const quickActions = [
    {
      label: "Launch readiness",
      description: "See blockers, refinements, and go-live confidence in one checklist.",
      to: "/admin/launch",
      icon: Sparkles,
      show: role === "admin",
    },
    {
      label: "Notification center",
      description: "Review recent sends, failures, and enabled receipt or alert channels.",
      to: "/admin/notifications",
      icon: Mail,
      show: role === "admin",
    },
    {
      label: "Diagnostics",
      description: "Check domain, billing, payment, and operator health without digging around.",
      to: "/admin/diagnostics",
      icon: Settings2,
      show: role === "admin",
    },
    {
      label: "Manage products",
      description: "Add products, prices, inventory, variants, and category metadata.",
      to: "/admin/products",
      icon: Package,
      show: true,
    },
    {
      label: "Process orders",
      description: "Review incoming orders, update statuses, and track category-specific order flows.",
      to: "/admin/orders",
      icon: ShoppingCart,
      show: true,
    },
    {
      label: "View messages",
      description: "Respond to customer questions and follow up on contact or inquiry leads.",
      to: "/admin/messages",
      icon: Mail,
      show: true,
    },
    {
      label: "Reopen onboarding",
      description: "Use guided setup again when you want help polishing launch details.",
      to: "/admin/onboarding",
      icon: WandSparkles,
      show: role === "admin",
    },
    {
      label: "More tools",
      description: "Open deeper editing and recovery tools only when the guided path is not enough.",
      to: "/admin/site-settings",
      icon: HardDriveDownload,
      show: role === "admin",
    },
  ].filter((action) => action.show);

  const primaryStatCards = [
    { title: "Total Orders", value: orderStats.total, isLoading: orderStatsLoading, icon: ShoppingCart, color: "text-primary" },
    { title: "Revenue", value: `BDT ${orderStats.revenue.toLocaleString()}`, isLoading: orderStatsLoading, icon: DollarSign, color: "text-green-500" },
    { title: "Pending Orders", value: orderStats.pending, isLoading: orderStatsLoading, icon: Clock, color: "text-yellow-500" },
    { title: "Total Products", value: productStats.total, isLoading: productStatsLoading, icon: Package, color: "text-accent" },
    { title: "Unread Messages", value: engagementStats.unreadMessages, isLoading: engagementStatsLoading, icon: Mail, color: "text-yellow-500" },
    { title: "Pending Reviews", value: engagementStats.pendingReviews, isLoading: engagementStatsLoading, icon: MessageSquare, color: "text-primary" },
  ];

  const advancedAnalyticsEnabled = getFeatureEnabled(entitlementData?.featureMap, "advanced_analytics", false);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (!activeStoreId) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Choose a storefront context before reviewing business data or setup progress.</p>
        </div>

        <Card className="border-border bg-card/70 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <PanelsTopLeft className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Select or Create a Store</CardTitle>
                <CardDescription>
                  The dashboard, storefront editor, and Site Settings all respond to the active store in the header switcher.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="text-sm font-medium text-foreground">Pick a store</p>
                <p className="mt-1 text-xs text-muted-foreground">If you already own one, use the store switcher in the top bar to load its admin state.</p>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="text-sm font-medium text-foreground">Create a new store</p>
                <p className="mt-1 text-xs text-muted-foreground">Guided Setup prepares the store profile, template defaults, starter pages, and launch-ready basics.</p>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="text-sm font-medium text-foreground">Return here for operations</p>
                <p className="mt-1 text-xs text-muted-foreground">Once a store is active, analytics, setup health, and order summaries fill in automatically.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="gap-2">
                <Link to="/signup">
                  <Sparkles className="h-4 w-4" />
                  Create Store
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dashboard Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {role === "admin" ? "Daily store operations, storefront editing, and launch health in one place." : "Product management access"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild className="gap-2">
            <Link to={buildPageBuilderPath("basic", { storeId: activeStoreId })}>
              <PanelsTopLeft className="h-4 w-4 text-primary" />
              Customize Store
            </Link>
          </Button>
        </div>
      </div>

      {/* Plan and Trial Banners */}
      {planNoticeLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : planNotice?.paymentRequired ? (
        <Card className="border-orange-500/30 bg-orange-500/10">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-orange-600" />
                Complete payment for {planNotice.currentPlan?.name}
              </CardTitle>
              <CardDescription className="text-xs">
                Your store is created and you are the owner. Complete payment to activate this package's paid benefits.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit border-orange-500/40 text-orange-700">
              {planNotice.subscription?.status?.replace("_", " ") || "payment pending"}
            </Badge>
          </CardHeader>
          <CardContent className="pb-4 flex flex-wrap gap-3">
            <Button asChild size="sm" className="gap-2">
              <Link to="/admin/billing">
                Complete payment <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!planNoticeLoading && planNotice?.isTrialPlan && !trialPlanDismissed ? (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="flex flex-row items-start justify-between gap-4 py-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                Your {planNotice.currentPlan?.name ?? "current"} trial is active
              </CardTitle>
              <CardDescription className="text-xs">
                You have {planNotice.remainingTrialDays ?? planNotice.trialDays ?? 0} day{(planNotice.remainingTrialDays ?? planNotice.trialDays ?? 0) === 1 ? "" : "s"} left in your trial. Finish setup and test payments.
              </CardDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={dismissTrialPlanNotice} aria-label="Dismiss trial plan notice">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="pb-4">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/admin/billing">
                Review Plans <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!setupCoachDismissed && nextWizardStep ? (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="flex flex-row items-start justify-between gap-4 py-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <WandSparkles className="h-5 w-5 text-primary" />
                Setup Coach: Next step is {nextWizardStep.label.toLowerCase()}
              </CardTitle>
              <CardDescription className="text-xs">
                {nextWizardStep.action}
              </CardDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={dismissSetupCoach} aria-label="Dismiss setup coach">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="pb-4 flex flex-wrap gap-3">
            <Button asChild size="sm" className="gap-2">
              <Link to={nextWizardStep.href}>
                <nextWizardStep.icon className="h-4 w-4" />
                {nextWizardStep.cta}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/onboarding?storeId=${encodeURIComponent(activeStoreId)}`}>
                Reopen onboarding guide
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Tabbed Dashboard Layout */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })}
        className="space-y-6"
      >
        <TabsList className="bg-secondary/40 p-1 border border-border flex flex-wrap gap-1">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="readiness" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Launch Readiness ({storeHealth.score}/100)
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart2 className="h-4 w-4" />
            Analytics & Traffic
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <Zap className="h-4 w-4" />
            Quick Shortcuts
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          {/* Primary Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {primaryStatCards.map((card, i) => (
              <Card key={card.title} className="border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.title}</CardTitle>
                  <div className={`p-2 rounded-md bg-secondary ${card.color}`}>
                    <card.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  {card.isLoading ? (
                    <Skeleton className="h-8 w-24 rounded-md" />
                  ) : (
                    <p className="font-heading text-2xl font-bold text-foreground">{card.value}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Merchant Workspaces */}
          {merchantWorkspaces.length > 0 && (
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-bold">Merchant Workspaces</CardTitle>
                <CardDescription className="text-xs">Quickly jump into editing your store layout, branding, or payment options.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-3 pb-5">
                {merchantWorkspaces.map((workspace) => (
                  <Link
                    key={workspace.label}
                    to={workspace.to}
                    className="rounded-xl border border-border bg-background/50 p-4 transition-colors hover:border-primary/40 hover:bg-background"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <workspace.icon className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">{workspace.label}</p>
                    <p className="mt-1 text-xs leading-4 text-muted-foreground">{workspace.description}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Open <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline & Recent Orders */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <StoreActivityTimeline storeId={activeStoreId} />
            </div>

            <Card className="lg:col-span-2 border-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg">Recent Orders</CardTitle>
                <Link to="/admin/orders" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {orderStatsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))}
                  </div>
                ) : recentOrders.length === 0 ? (
                  <AdminEmptyState
                    icon={ShoppingCart}
                    title="No orders yet"
                    description="This store has not recorded its first order yet."
                    helper="Once shoppers begin placing orders, this becomes the fastest place to see purchase activity."
                    actions={[
                      { label: "Open launch readiness", href: `/admin/launch?storeId=${encodeURIComponent(activeStoreId)}` },
                      { label: "Open storefront editor", href: buildPageBuilderPath("basic", { storeId: activeStoreId }), variant: "outline" },
                    ]}
                    compact
                  />
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/30"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-bold text-foreground">
                              {order.order_number}
                            </span>
                            <Badge variant="outline" className={statusColors[order.status] || "border-border text-muted-foreground"}>
                              {order.status}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{order.customer_name}</span> - {formatDate(order.created_at)}
                          </p>
                        </div>
                        <span className="ml-4 whitespace-nowrap font-heading text-base font-bold text-primary">
                          BDT {order.total}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: LAUNCH READINESS & SETUP */}
        <TabsContent value="readiness" className="space-y-6">
          <LaunchReadinessPage />
        </TabsContent>

        {/* TAB 3: ANALYTICS & TRAFFIC */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="col-span-2 border-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Storefront Analytics
                  </CardTitle>
                  <CardDescription>
                    {analyticsTimeRange === "today"
                      ? "Today's storefront behavior from visitors and shoppers."
                      : analyticsTimeRange === "7d"
                      ? "Last 7 days of storefront behavior from visitors and shoppers."
                      : "Last 30 days of storefront behavior from visitors and shoppers."}
                  </CardDescription>
                </div>
                {/* Date Range Picker */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-background/60 p-1">
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnalyticsTimeRange(opt.value)}
                      className={cn(
                        "rounded-md px-3 py-1 text-xs font-medium transition-all",
                        analyticsTimeRange === opt.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-4">
                {analyticsLoading
                  ? Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} className="rounded-lg border border-border bg-background/60 p-4 space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-7 w-12" />
                      </div>
                    ))
                  : [
                      { label: "Visitors", value: storefrontAnalytics.visitors },
                      { label: "Sessions", value: storefrontAnalytics.sessions },
                      { label: "Page Views", value: storefrontAnalytics.pageViews },
                      { label: "Product Views", value: storefrontAnalytics.productViews },
                      { label: "Add to Cart", value: storefrontAnalytics.addToCart },
                      { label: "Wishlist Adds", value: storefrontAnalytics.wishlistAdds },
                      { label: "Checkout Starts", value: storefrontAnalytics.checkoutStarts },
                      { label: "Purchases", value: storefrontAnalytics.purchases },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border border-border bg-background/60 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                        <p className="mt-2 font-heading text-2xl font-bold text-foreground">{item.value}</p>
                      </div>
                    ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Discovery Signals</CardTitle>
                <CardDescription>Where visitors came from and what they searched.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {analyticsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Traffic Sources</p>
                      <div className="space-y-2">
                        {topSources.length > 0 ? topSources.map((source) => (
                          <div key={source.label} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{source.label}</span>
                            <span className="text-muted-foreground">{source.value}</span>
                          </div>
                        )) : <p className="text-sm text-muted-foreground">No traffic-source data yet.</p>}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Searches</p>
                      <div className="space-y-2">
                        {topSearches.length > 0 ? topSearches.map((search) => (
                          <div key={search.label} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate text-foreground">{search.label}</span>
                            <span className="text-muted-foreground">{search.value}</span>
                          </div>
                        )) : <p className="text-sm text-muted-foreground">No storefront search data yet.</p>}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart & Order Distribution */}
          {advancedAnalyticsEnabled ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="col-span-2 border-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                  <CardDescription>Daily revenue performance over recent order period</CardDescription>
                </CardHeader>
                <CardContent>
                  {orderStatsLoading ? (
                    <Skeleton className="h-[280px] w-full rounded-lg" />
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(145, 63%, 42%)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(145, 63%, 42%)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `BDT ${value}`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="hsl(145, 63%, 42%)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Order Distribution</CardTitle>
                  <CardDescription>Breakdown by order status</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-[280px]">
                  {orderStatsLoading ? (
                    <Skeleton className="h-[240px] w-full rounded-full" />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-2 flex flex-wrap justify-center gap-2">
                        {statusData.map((entry, index) => (
                          <div key={entry.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                            {entry.name}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-border bg-card/50">
              <CardHeader>
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>Revenue charts and order distribution are available on packages with advanced analytics.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/admin/billing">
                    View upgrade options <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 4: QUICK SHORTCUTS */}
        <TabsContent value="actions" className="space-y-6">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Operations Shortcuts
              </CardTitle>
              <CardDescription>Shortcuts for common merchant tasks during daily operations.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-secondary/60"
                >
                  <div className="p-2.5 rounded-md bg-primary/10 text-primary">
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm">{action.label}</p>
                    <p className="mt-1 text-xs font-normal leading-4 text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground shrink-0 self-center" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
