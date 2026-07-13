import { useEffect, useState } from "react";
import { Link } from "@/lib/react-router-dom-shim";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth-context";
import { buildStoreReadinessScore, type StoreReadinessState } from "@/lib/platform/store-readiness";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import { useStoreEntitlements } from "@/hooks/useStoreEntitlements";
import { getFeatureEnabled } from "@/lib/platform/control-plane";
import { toast } from "sonner";

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  customer_name: string;
  created_at: string;
}

interface PlanRecord {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number | null;
}

interface SubscriptionRecord {
  plan_id: string;
  status: string;
}

interface DashboardPlanNotice {
  currentPlan: PlanRecord | null;
  subscription: SubscriptionRecord | null;
  paymentRequired: boolean;
  isFreePlan: boolean;
  upgradePlanNames: string[];
}

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

const Dashboard = () => {
  const { role , activeStoreId} = useAuth();
  const { data: entitlementData } = useStoreEntitlements(activeStoreId);
  const [productStats, setProductStats] = useState({ total: 0, outOfStock: 0, featured: 0 });
  const [orderStats, setOrderStats] = useState({ total: 0, revenue: 0, pending: 0 });
  const [engagementStats, setEngagementStats] = useState({ unreadMessages: 0, pendingReviews: 0 });
  const [pageStats, setPageStats] = useState({ totalPages: 0, customPages: 0, visibleHomepageBlocks: 0 });
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [planNotice, setPlanNotice] = useState<DashboardPlanNotice | null>(null);
  const [freePlanDismissed, setFreePlanDismissed] = useState(false);
  const [storeHealth, setStoreHealth] = useState<StoreReadinessState>({
    score: 0,
    items: [],
  });

  useEffect(() => {
    if (!activeStoreId) {
      setProductStats({ total: 0, outOfStock: 0, featured: 0 });
      setOrderStats({ total: 0, revenue: 0, pending: 0 });
      setEngagementStats({ unreadMessages: 0, pendingReviews: 0 });
      setPageStats({ totalPages: 0, customPages: 0, visibleHomepageBlocks: 0 });
      setRecentOrders([]);
      setChartData([]);
      setStatusData([]);
      setPlanNotice(null);
      setStoreHealth({ score: 0, items: [] });
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      try {
        const [
          { data: products },
          { data: orders },
          { data: storeRecord },
          { data: pages },
          { data: blocks },
          { data: siteSettingsRows },
          { data: subscription },
          { data: plans },
          { count: unreadMessages },
          { count: pendingReviews },
        ] = await Promise.all([
          supabase.from("products").select("id, stock, featured").eq("store_id", activeStoreId as string),
          supabase.from("orders").select("id, order_number, status, total, customer_name, created_at").eq("store_id", activeStoreId as string).order("created_at", { ascending: false }).limit(100),
          supabase.from("stores").select("id, description, logo_url, is_published").eq("id", activeStoreId as string).maybeSingle(),
          supabase.from("store_pages").select("id, slug, is_homepage").eq("store_id", activeStoreId as string),
          supabase.from("store_page_blocks").select("page_id, is_visible").eq("store_id", activeStoreId as string),
          supabase.from("site_settings").select("key, value").eq("store_id", activeStoreId as string).in("key", ["payment_settings", "whatsapp_support", "contact_page"]),
          supabase.from("store_subscriptions").select("plan_id, status").eq("store_id", activeStoreId as string).maybeSingle(),
          supabase.from("cms_plans").select("id, name, description, monthly_price").eq("is_active", true).order("sort_order"),
          supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("store_id", activeStoreId as string).eq("is_read", false),
          supabase.from("product_reviews").select("*", { count: "exact", head: true }).eq("store_id", activeStoreId as string).eq("status", "pending"),
        ]);

        if (cancelled) return;

        if (products) {
          setProductStats({
            total: products.length,
            outOfStock: products.filter((p) => p.stock <= 0).length,
            featured: products.filter((p) => p.featured).length,
          });
        }

        if (orders && orders.length > 0) {
          const typedOrders = orders as unknown as OrderRow[];
          setRecentOrders(typedOrders.slice(0, 5));
          setOrderStats({
            total: typedOrders.length,
            revenue: typedOrders
              .filter((o) => o.status !== "cancelled")
              .reduce((sum, o) => sum + (o.total || 0), 0),
            pending: typedOrders.filter((o) => o.status === "pending" || o.status === "pending_payment").length,
          });

        // Analytics Processing (If enough real data exists, replace mock data)
          if (typedOrders.length > 0) {
            const revMap: Record<string, number> = {};
            const statusCounts: Record<string, number> = {};
          
            typedOrders.forEach(o => {
              if (o.status !== "cancelled") {
                const d = new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                revMap[d] = (revMap[d] || 0) + o.total;
              }
              statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
            });

          // Generate last 7 days chart data if available
            const realChartData = Object.keys(revMap).slice(0, 7).reverse().map(date => ({
              date,
              revenue: revMap[date],
              orders: typedOrders.filter((o) => {
                const d = new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                return d === date && o.status !== "cancelled";
              }).length,
            }));
            setChartData(realChartData);

            const realStatusData = Object.keys(statusCounts).map(status => ({
              name: status.charAt(0).toUpperCase() + status.slice(1).replace("_", " "),
              value: statusCounts[status]
            }));
            setStatusData(realStatusData);
          }
        } else {
          setRecentOrders([]);
          setOrderStats({ total: 0, revenue: 0, pending: 0 });
          setChartData([]);
          setStatusData([]);
        }

        const paymentSettingsMap = Object.fromEntries(
          ((siteSettingsRows as Array<{ key: string; value: any }> | null) ?? []).map((row) => [row.key, row.value]),
        );
        const paymentSettings = paymentSettingsMap.payment_settings ?? {};
        const whatsappSettings = paymentSettingsMap.whatsapp_support ?? {};
        const contactSettings = paymentSettingsMap.contact_page ?? {};
        const typedStoreRecord = (storeRecord as { id: string; description: string | null; logo_url: string | null; is_published: boolean | null } | null) ?? null;
        const homepage = ((pages as Array<{ id: string; slug: string; is_homepage: boolean | null }> | null) ?? []).find((page) => page.is_homepage || page.slug === "/");
        const visibleHomepageBlocks = ((blocks as Array<{ page_id: string; is_visible: boolean | null }> | null) ?? []).filter(
          (block) => block.page_id === homepage?.id && block.is_visible !== false,
        ).length;
        const customPageTotal = ((pages as Array<{ id: string; slug: string; is_homepage: boolean | null }> | null) ?? []).filter(
          (page) => !page.is_homepage && page.slug !== "/",
        ).length;
        setPageStats({
          totalPages: ((pages as Array<{ id: string; slug: string; is_homepage: boolean | null }> | null) ?? []).length,
          customPages: customPageTotal,
          visibleHomepageBlocks,
        });
        setEngagementStats({
          unreadMessages: unreadMessages ?? 0,
          pendingReviews: pendingReviews ?? 0,
        });
        const paymentConfigured = Boolean(
          paymentSettings?.cod_enabled ||
          paymentSettings?.bkash_enabled ||
          paymentSettings?.nagad_enabled ||
          paymentSettings?.bkash_number ||
          paymentSettings?.nagad_number,
        );
        const whatsappConfigured = Boolean(
          whatsappSettings?.enabled && whatsappSettings?.number,
        );
        const contactConfigured = Boolean(
          whatsappConfigured ||
          contactSettings?.phone ||
          contactSettings?.email ||
          contactSettings?.address,
        );

        setStoreHealth(
          buildStoreReadinessScore({
            storePublished: Boolean(typedStoreRecord?.is_published),
            storeDescription: String(typedStoreRecord?.description ?? ""),
            logoConfigured: Boolean(typedStoreRecord?.logo_url),
            productTotal: products?.length ?? 0,
            featuredTotal: products?.filter((product) => product.featured).length ?? 0,
            paymentConfigured,
            contactConfigured,
            customPageTotal,
            visibleHomepageBlocks,
          }),
        );

        const typedPlans = ((plans as PlanRecord[] | null) ?? []);
        const typedSubscription = (subscription as SubscriptionRecord | null) ?? null;
        const starterPlan = typedPlans.find((plan) => plan.id === "starter") ?? typedPlans[0] ?? null;
        const currentPlan = typedPlans.find((plan) => plan.id === typedSubscription?.plan_id) ?? starterPlan;
        const monthlyPrice = currentPlan?.monthly_price;
        const paidOrCustomPlan = currentPlan ? monthlyPrice !== 0 : false;
        const subscriptionReady = typedSubscription?.status === "active" || typedSubscription?.status === "trialing";
        setPlanNotice({
          currentPlan,
          subscription: typedSubscription,
          paymentRequired: paidOrCustomPlan && !subscriptionReady,
          isFreePlan: Boolean(currentPlan && monthlyPrice === 0 && subscriptionReady),
          upgradePlanNames: typedPlans.filter((plan) => plan.id !== currentPlan?.id && plan.monthly_price !== 0).map((plan) => plan.name).slice(0, 2),
        });
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          toast.error("Failed to load dashboard data.");
        }
      }
    };
    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [activeStoreId]);

  useEffect(() => {
    if (!activeStoreId || typeof window === "undefined") return;
    setFreePlanDismissed(window.localStorage.getItem(`dashboard-free-plan-dismissed:${activeStoreId}`) === "true");
  }, [activeStoreId]);

  const dismissFreePlanNotice = () => {
    setFreePlanDismissed(true);
    if (activeStoreId && typeof window !== "undefined") {
      window.localStorage.setItem(`dashboard-free-plan-dismissed:${activeStoreId}`, "true");
    }
  };

  const statCards = [
    { title: "Total Orders", value: orderStats.total, icon: ShoppingCart, color: "text-primary" },
    { title: "Revenue", value: `BDT ${orderStats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-green-500" },
    { title: "Pending", value: orderStats.pending, icon: Clock, color: "text-yellow-500" },
    { title: "Products", value: productStats.total, icon: Package, color: "text-accent" },
    { title: "Out of Stock", value: productStats.outOfStock, icon: AlertTriangle, color: "text-destructive" },
    { title: "Featured", value: productStats.featured, icon: TrendingUp, color: "text-primary" },
    { title: "Store Pages", value: pageStats.totalPages, icon: FileText, color: "text-primary" },
    { title: "Custom Pages", value: pageStats.customPages, icon: FileText, color: "text-green-500" },
    { title: "Home Blocks", value: pageStats.visibleHomepageBlocks, icon: PanelsTopLeft, color: "text-accent" },
    { title: "Unread Messages", value: engagementStats.unreadMessages, icon: Mail, color: "text-yellow-500" },
    { title: "Pending Reviews", value: engagementStats.pendingReviews, icon: MessageSquare, color: "text-primary" },
  ];
  const advancedAnalyticsEnabled = getFeatureEnabled(entitlementData?.featureMap, "advanced_analytics", false);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {role === "admin" ? "Full business overview and analytics" : "Product management access"}
        </p>
      </div>

      {planNotice?.paymentRequired ? (
        <Card className="border-orange-500/30 bg-orange-500/10">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-orange-600" />
                Complete payment for {planNotice.currentPlan?.name}
              </CardTitle>
              <CardDescription>
                Your store is created and you are the owner. Complete payment to activate this package's paid benefits.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit border-orange-500/40 text-orange-700">
              {planNotice.subscription?.status?.replace("_", " ") || "payment pending"}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link to="/admin/billing">
                Complete payment <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/onboarding">Continue store setup</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {planNotice?.isFreePlan && !freePlanDismissed ? (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                You are on the free Starter plan
              </CardTitle>
              <CardDescription>
                Upgrade for stronger growth tools{planNotice.upgradePlanNames.length ? ` like ${planNotice.upgradePlanNames.join(" and ")}` : ""}, team access, richer storefront controls, and advanced features.
              </CardDescription>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={dismissFreePlanNotice} aria-label="Dismiss free plan notice">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/admin/billing">
                Upgrade <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card, i) => (
          <Card key={card.title} className="border-border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50" style={{ animationDelay: `${i * 50}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-2 rounded-md bg-secondary ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Go-Live Readiness
            </CardTitle>
            <CardDescription>Practical setup checks that help shorten time-to-first-sale.</CardDescription>
          </div>
          <Badge variant={storeHealth.score >= 70 ? "default" : "secondary"} className="text-sm">
            {storeHealth.score}/100
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          {storeHealth.items.some((item) => !item.done) ? (
            <Button asChild className="w-full gap-2 sm:w-auto">
              <Link to="/admin/onboarding">
                Continue setup <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}

          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${storeHealth.score}%` }}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {storeHealth.items.map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-background/40 p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${item.done ? "text-primary" : "text-muted-foreground"}`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <Badge variant={item.done ? "default" : "outline"}>+{item.points}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.done ? "Done" : item.action}
                    </p>
                    {!item.done ? (
                      <Link to={item.href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        Fix this <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Charts */}
      {advancedAnalyticsEnabled ? (
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="col-span-2 border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Daily revenue performance over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
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
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Order Distribution</CardTitle>
            <CardDescription>Breakdown by order status</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[300px]">
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
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {statusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  {entry.name}
                </div>
              ))}
            </div>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="grid gap-4 lg:col-span-1">
          <h2 className="font-heading text-xl font-bold text-foreground">Quick Actions</h2>
          {[
            { label: "Manage Products", to: "/admin/products", icon: Package },
            { label: "View Orders", to: "/admin/orders", icon: ShoppingCart },
            { label: "Page Builder", to: "/admin/page-builder", icon: PanelsTopLeft, adminOnly: true },
            { label: "Site Settings", to: "/admin/site-settings", icon: TrendingUp, adminOnly: true },
          ]
            .filter((a) => !a.adminOnly || role === "admin")
            .map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex items-center gap-3 rounded-lg border border-border bg-card/50 backdrop-blur-sm p-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:border-primary/30"
              >
                <div className="p-2 rounded-md bg-primary/10">
                  <action.icon className="h-4 w-4 text-primary" />
                </div>
                {action.label}
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
        </div>

        {/* Recent orders */}
        <Card className="col-span-2 border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Recent Orders</CardTitle>
            <Link to="/admin/orders" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
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
                    <span className="ml-4 whitespace-nowrap font-heading text-lg font-bold text-primary">
                      BDT {order.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
