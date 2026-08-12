import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildStoreReadinessScore, type StoreReadinessState } from "@/lib/platform/store-readiness";
import { getPlanTrialDays, getRemainingTrialDays, resolveStorePlanState } from "@/lib/billing/plans";
import { toast } from "sonner";

export interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  customer_name: string;
  created_at: string;
}

export interface PlanRecord {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number | null;
}

export interface SubscriptionRecord {
  plan_id: string;
  status: string;
  trial_ends_at?: string | null;
}

export interface DashboardPlanNotice {
  currentPlan: PlanRecord | null;
  subscription: SubscriptionRecord | null;
  paymentRequired: boolean;
  isTrialPlan: boolean;
  upgradePlanNames: string[];
  trialEndsAt?: string | null;
  trialDays?: number;
  remainingTrialDays?: number | null;
}

export type AnalyticsTimeRange = "today" | "7d" | "30d";

export interface StorefrontAnalytics {
  visitors: number;
  sessions: number;
  pageViews: number;
  productViews: number;
  addToCart: number;
  wishlistAdds: number;
  checkoutStarts: number;
  purchases: number;
}

// 1. Hook for product stats
export function useStoreProductStats(storeId?: string | null) {
  return useQuery({
    queryKey: ["store-product-stats", storeId],
    queryFn: async () => {
      if (!storeId) return { total: 0, outOfStock: 0, featured: 0 };
      const { data: products, error } = await supabase
        .from("products")
        .select("id, stock, featured")
        .eq("store_id", storeId);

      if (error) throw error;

      const items = products ?? [];
      return {
        total: items.length,
        outOfStock: items.filter((p) => p.stock <= 0).length,
        featured: items.filter((p) => p.featured).length,
      };
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });
}

// 2. Hook for orders & order stats
export function useStoreOrderStats(storeId?: string | null) {
  return useQuery({
    queryKey: ["store-order-stats", storeId],
    queryFn: async () => {
      if (!storeId)
        return {
          typedOrders: [],
          recentOrders: [],
          orderStats: { total: 0, revenue: 0, pending: 0 },
          chartData: [],
          statusData: [],
        };

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total, customer_name, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const typedOrders = ((orders as unknown as OrderRow[]) ?? []);
      const recentOrders = typedOrders.slice(0, 5);
      const orderStats = {
        total: typedOrders.length,
        revenue: typedOrders
          .filter((o) => o.status !== "cancelled")
          .reduce((sum, o) => sum + (o.total || 0), 0),
        pending: typedOrders.filter(
          (o) => o.status === "pending" || o.status === "pending_payment"
        ).length,
      };

      let chartData: any[] = [];
      let statusData: any[] = [];

      if (typedOrders.length > 0) {
        const revMap: Record<string, number> = {};
        const statusCounts: Record<string, number> = {};

        typedOrders.forEach((o) => {
          if (o.status !== "cancelled") {
            const d = new Date(o.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            });
            revMap[d] = (revMap[d] || 0) + o.total;
          }
          statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
        });

        chartData = Object.keys(revMap)
          .slice(0, 7)
          .reverse()
          .map((date) => ({
            date,
            revenue: revMap[date],
            orders: typedOrders.filter((o) => {
              const d = new Date(o.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              });
              return d === date && o.status !== "cancelled";
            }).length,
          }));

        statusData = Object.keys(statusCounts).map((status) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1).replace("_", " "),
          value: statusCounts[status],
        }));
      }

      return {
        typedOrders,
        recentOrders,
        orderStats,
        chartData,
        statusData,
      };
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });
}

// 3. Hook for engagement stats (messages, reviews)
export function useStoreEngagementStats(storeId?: string | null) {
  return useQuery({
    queryKey: ["store-engagement-stats", storeId],
    queryFn: async () => {
      if (!storeId) return { unreadMessages: 0, pendingReviews: 0 };
      const [{ count: unreadMessages }, { count: pendingReviews }] = await Promise.all([
        supabase
          .from("contact_messages")
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeId)
          .eq("is_read", false),
        supabase
          .from("product_reviews")
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeId)
          .eq("status", "pending"),
      ]);

      return {
        unreadMessages: unreadMessages ?? 0,
        pendingReviews: pendingReviews ?? 0,
      };
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });
}

// 4. Hook for page stats
export function useStorePageStats(storeId?: string | null) {
  return useQuery({
    queryKey: ["store-page-stats", storeId],
    queryFn: async () => {
      if (!storeId)
        return {
          totalPages: 0,
          customPages: 0,
          visibleHomepageBlocks: 0,
        };

      const [{ data: pages }, { data: blocks }] = await Promise.all([
        supabase.from("store_pages").select("id, slug, is_homepage").eq("store_id", storeId),
        supabase.from("store_page_blocks").select("page_id, is_visible").eq("store_id", storeId),
      ]);

      const typedPages = (pages ?? []) as Array<{ id: string; slug: string; is_homepage: boolean | null }>;
      const typedBlocks = (blocks ?? []) as Array<{ page_id: string; is_visible: boolean | null }>;

      const homepage = typedPages.find((page) => page.is_homepage || page.slug === "/");
      const visibleHomepageBlocks = typedBlocks.filter(
        (block) => block.page_id === homepage?.id && block.is_visible !== false
      ).length;
      const customPageTotal = typedPages.filter(
        (page) => !page.is_homepage && page.slug !== "/"
      ).length;

      return {
        totalPages: typedPages.length,
        customPages: customPageTotal,
        visibleHomepageBlocks,
      };
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });
}

// 5. Hook for store readiness score & health
export function useStoreHealth(storeId?: string | null) {
  return useQuery({
    queryKey: ["store-health", storeId],
    queryFn: async () => {
      if (!storeId)
        return {
          score: 0,
          items: [],
        } as StoreReadinessState;

      const [
        { data: storeRecord },
        { data: products },
        { data: pages },
        { data: blocks },
        { data: siteSettingsRows },
      ] = await Promise.all([
        supabase
          .from("stores")
          .select("id, description, logo_url, is_published")
          .eq("id", storeId)
          .maybeSingle(),
        supabase.from("products").select("id, featured").eq("store_id", storeId),
        supabase.from("store_pages").select("id, slug, is_homepage").eq("store_id", storeId),
        supabase.from("store_page_blocks").select("page_id, is_visible").eq("store_id", storeId),
        supabase
          .from("site_settings")
          .select("key, value")
          .eq("store_id", storeId)
          .in("key", ["payment_settings", "whatsapp_support", "contact_page"]),
      ]);

      const paymentSettingsMap = Object.fromEntries(
        ((siteSettingsRows as Array<{ key: string; value: any }> | null) ?? []).map((row) => [row.key, row.value])
      );
      const paymentSettings = paymentSettingsMap.payment_settings ?? {};
      const whatsappSettings = paymentSettingsMap.whatsapp_support ?? {};
      const contactSettings = paymentSettingsMap.contact_page ?? {};

      const typedStoreRecord = storeRecord as {
        id: string;
        description: string | null;
        logo_url: string | null;
        is_published: boolean | null;
      } | null;

      const typedPages = (pages ?? []) as Array<{ id: string; slug: string; is_homepage: boolean | null }>;
      const typedBlocks = (blocks ?? []) as Array<{ page_id: string; is_visible: boolean | null }>;

      const homepage = typedPages.find((page) => page.is_homepage || page.slug === "/");
      const visibleHomepageBlocks = typedBlocks.filter(
        (block) => block.page_id === homepage?.id && block.is_visible !== false
      ).length;
      const customPageTotal = typedPages.filter(
        (page) => !page.is_homepage && page.slug !== "/"
      ).length;

      const paymentConfigured = Boolean(
        paymentSettings?.cod_enabled ||
          paymentSettings?.bkash_enabled ||
          paymentSettings?.nagad_enabled ||
          paymentSettings?.bkash_number ||
          paymentSettings?.nagad_number
      );
      const whatsappConfigured = Boolean(whatsappSettings?.enabled && whatsappSettings?.number);
      const contactConfigured = Boolean(
        whatsappConfigured ||
          contactSettings?.phone ||
          contactSettings?.email ||
          contactSettings?.address
      );

      const health = buildStoreReadinessScore({
        storePublished: Boolean(typedStoreRecord?.is_published),
        storeDescription: String(typedStoreRecord?.description ?? ""),
        logoConfigured: Boolean(typedStoreRecord?.logo_url),
        productTotal: products?.length ?? 0,
        featuredTotal: products?.filter((p) => p.featured).length ?? 0,
        paymentConfigured,
        contactConfigured,
        customPageTotal,
        visibleHomepageBlocks,
      });

      return health;
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });
}

// 6. Hook for plan notice
export function useStorePlanNotice(storeId?: string | null) {
  return useQuery({
    queryKey: ["store-plan-notice", storeId],
    queryFn: async () => {
      if (!storeId) return null;

      const [{ data: subscription }, { data: store }, { data: plans }] = await Promise.all([
        supabase
          .from("store_subscriptions")
          .select("plan_id, status, trial_ends_at")
          .eq("store_id", storeId)
          .maybeSingle(),
        supabase
          .from("stores")
          .select("plan")
          .eq("id", storeId)
          .maybeSingle(),
        supabase
          .from("cms_plans")
          .select("id, name, description, monthly_price, trial_days")
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      const typedPlans = (plans as PlanRecord[] | null) ?? [];
      const typedSubscription = (subscription as SubscriptionRecord | null) ?? null;
      const resolvedPlanState = resolveStorePlanState({
        subscription: typedSubscription,
        legacyPlanId: typeof (store as { plan?: unknown } | null)?.plan === "string"
          ? (store as { plan: string }).plan
          : null,
      });
      const defaultPlan = typedPlans.find((plan) => plan.id === "basic") ?? typedPlans[0] ?? null;
      const currentPlan =
        typedPlans.find((plan) => plan.id === resolvedPlanState.effectivePlanId)
        ?? typedPlans.find((plan) => plan.id === resolvedPlanState.subscriptionPlanId)
        ?? typedPlans.find((plan) => plan.id === resolvedPlanState.legacyPlanId)
        ?? defaultPlan;
      const monthlyPrice = currentPlan?.monthly_price;
      const paidOrCustomPlan = currentPlan ? monthlyPrice !== 0 : false;
      const effectiveStatus = resolvedPlanState.subscriptionStatus;
      const subscriptionReady = effectiveStatus === "active" || effectiveStatus === "trialing";
      const trialDays = getPlanTrialDays(currentPlan as any);
      const remainingTrialDays = getRemainingTrialDays(typedSubscription?.trial_ends_at);

      const notice: DashboardPlanNotice = {
        currentPlan,
        subscription: typedSubscription,
        paymentRequired: paidOrCustomPlan && !subscriptionReady,
        isTrialPlan: effectiveStatus === "trialing",
        upgradePlanNames: typedPlans
          .filter((plan) => plan.id !== currentPlan?.id && plan.monthly_price !== 0)
          .map((plan) => plan.name)
          .slice(0, 2),
        trialEndsAt: typedSubscription?.trial_ends_at ?? null,
        trialDays,
        remainingTrialDays,
      };

      return notice;
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });
}

// 7. Hook for storefront analytics with Date Range flexibility
export function useStoreAnalytics(
  storeId?: string | null,
  timeRange: AnalyticsTimeRange = "30d"
) {
  return useQuery({
    queryKey: ["store-analytics-events", storeId, timeRange],
    queryFn: async () => {
      if (!storeId)
        return {
          analytics: {
            visitors: 0,
            sessions: 0,
            pageViews: 0,
            productViews: 0,
            addToCart: 0,
            wishlistAdds: 0,
            checkoutStarts: 0,
            purchases: 0,
          },
          topSources: [],
          topSearches: [],
        };

      let cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000; // default 30d
      if (timeRange === "today") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        cutoffMs = startOfToday.getTime();
      } else if (timeRange === "7d") {
        cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
      }

      const { data: analyticsEvents, error } = await (supabase as any)
        .from("store_analytics_events")
        .select("event_name, visitor_id, session_id, traffic_source, search_query")
        .eq("store_id", storeId)
        .gte("event_timestamp", new Date(cutoffMs).toISOString())
        .limit(3000);

      if (error) throw error;

      const analyticsRows = (analyticsEvents ?? []) as Array<{
        event_name: string;
        visitor_id?: string | null;
        session_id?: string | null;
        traffic_source?: string | null;
        search_query?: string | null;
      }>;

      const sourceCounts = new Map<string, number>();
      const searchCounts = new Map<string, number>();

      analyticsRows.forEach((event) => {
        const source = (event.traffic_source || "direct").trim() || "direct";
        sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
        const search = event.search_query?.trim().toLowerCase();
        if (search) {
          searchCounts.set(search, (searchCounts.get(search) ?? 0) + 1);
        }
      });

      const analytics: StorefrontAnalytics = {
        visitors: new Set(analyticsRows.map((e) => e.visitor_id).filter(Boolean)).size,
        sessions: new Set(analyticsRows.map((e) => e.session_id).filter(Boolean)).size,
        pageViews: analyticsRows.filter((e) => e.event_name === "page_view").length,
        productViews: analyticsRows.filter((e) => e.event_name === "view_item").length,
        addToCart: analyticsRows.filter((e) => e.event_name === "add_to_cart").length,
        wishlistAdds: analyticsRows.filter((e) => e.event_name === "add_to_wishlist").length,
        checkoutStarts: analyticsRows.filter((e) => e.event_name === "begin_checkout").length,
        purchases: analyticsRows.filter((e) => e.event_name === "purchase").length,
      };

      const topSources = [...sourceCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, value]) => ({ label, value }));

      const topSearches = [...searchCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, value]) => ({ label, value }));

      return { analytics, topSources, topSearches };
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });
}

// 8. Hook for Supabase Real-time Subscriptions
export function useDashboardRealtime(storeId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`admin-dashboard-realtime:${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["store-order-stats", storeId] });
          queryClient.invalidateQueries({ queryKey: ["store-health", storeId] });

          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as any;
            toast.success(`🎉 New Order #${newOrder.order_number || ""} received!`, {
              description: `${newOrder.customer_name || "Customer"} placed an order of BDT ${newOrder.total || 0}`,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contact_messages",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["store-engagement-stats", storeId] });

          if (payload.eventType === "INSERT") {
            toast.info("📩 New customer message received!", {
              description: "Check your messages inbox for details.",
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_reviews",
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["store-engagement-stats", storeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);
}
