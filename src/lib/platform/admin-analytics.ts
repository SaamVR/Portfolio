import { getDefaultLifecycleState, type StoreLifecycleStateRecord } from "@/lib/platform/control-plane";
import { getEffectiveSubscriptionStatus } from "@/lib/billing/plans";

export type PlatformAnalyticsInput = {
  stores: Array<{
    id: string;
    owner_id?: string | null;
    name: string;
    slug: string;
    custom_domain?: string | null;
    is_published: boolean | null;
    updated_at?: string | null;
  }>;
  plans: Array<{ id: string; name: string; monthly_price: number | null }>;
  subscriptions: Array<{
    store_id: string;
    plan_id: string | null;
    status: string | null;
    trial_ends_at?: string | null;
  }>;
  orders: Array<{ store_id: string; status: string; total: number | null }>;
  products: Array<{ store_id: string }>;
  pages: Array<{ store_id: string; slug: string; is_homepage: boolean | null }>;
  blocks: Array<{ store_id: string; is_visible: boolean | null }>;
  memberships: Array<{ store_id: string; user_id: string; role: string }>;
  lifecycleStates: Array<Partial<StoreLifecycleStateRecord> & { store_id: string; lifecycle_status: string }>;
};

export type StorePlatformSummary = PlatformAnalyticsInput["stores"][number] & {
  planId: string | null;
  planName: string;
  subscriptionStatus: string;
  orderTotal: number;
  revenue: number;
  productTotal: number;
  pageTotal: number;
  customPageTotal: number;
  blockTotal: number;
  visibleBlockTotal: number;
  memberTotal: number;
  ownerLabel: string;
  lifecycleStatus: string;
  lastActivity: string | null;
  hasHomepage: boolean;
};

export type PlatformOverviewStats = {
  totalStores: number;
  publishedStores: number;
  draftStores: number;
  paidStores: number;
  trialStores: number;
  freeStores: number;
  totalOrders: number;
  platformGmv: number;
  totalProducts: number;
  lifecycleRisk: number;
};

function shortId(value?: string | null) {
  return value ? value.slice(0, 8) : "unknown";
}

export function buildStorePlatformSummaries(input: PlatformAnalyticsInput): StorePlatformSummary[] {
  return input.stores.map((store) => {
    const subscription = input.subscriptions.find((item) => item.store_id === store.id);
    const plan = input.plans.find((item) => item.id === subscription?.plan_id);
    const storeOrders = input.orders.filter((item) => item.store_id === store.id);
    const storeProducts = input.products.filter((item) => item.store_id === store.id);
    const storePages = input.pages.filter((item) => item.store_id === store.id);
    const storeBlocks = input.blocks.filter((item) => item.store_id === store.id);
    const storeMembers = input.memberships.filter((item) => item.store_id === store.id);
    const lifecycle = input.lifecycleStates.find((item) => item.store_id === store.id) ?? getDefaultLifecycleState(store.id);

    return {
      ...store,
      planId: subscription?.plan_id ?? null,
      planName: plan?.name ?? subscription?.plan_id ?? "No plan",
      subscriptionStatus: getEffectiveSubscriptionStatus(subscription) ?? "missing",
      orderTotal: storeOrders.length,
      revenue: storeOrders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + (order.total ?? 0), 0),
      productTotal: storeProducts.length,
      pageTotal: storePages.length,
      customPageTotal: storePages.filter((page) => !page.is_homepage && page.slug !== "/").length,
      blockTotal: storeBlocks.length,
      visibleBlockTotal: storeBlocks.filter((block) => block.is_visible !== false).length,
      memberTotal: storeMembers.length,
      ownerLabel: shortId(store.owner_id ?? storeMembers.find((member) => member.role === "owner")?.user_id),
      lifecycleStatus: lifecycle.lifecycle_status,
      lastActivity: lifecycle.last_activity_at ?? store.updated_at ?? null,
      hasHomepage: storePages.some((page) => page.is_homepage || page.slug === "/"),
    };
  });
}

export function buildPlatformOverviewStats(
  summaries: StorePlatformSummary[],
  input: Pick<PlatformAnalyticsInput, "orders" | "products" | "plans">,
): PlatformOverviewStats {
  const activeSubscriptions = summaries.filter((store) => ["active", "trialing"].includes(store.subscriptionStatus));
  const paidStores = activeSubscriptions.filter((store) => (input.plans.find((plan) => plan.id === store.planId)?.monthly_price ?? 0) > 0);
  const freeStores = activeSubscriptions.filter((store) => (input.plans.find((plan) => plan.id === store.planId)?.monthly_price ?? 0) === 0);

  return {
    totalStores: summaries.length,
    publishedStores: summaries.filter((store) => store.is_published).length,
    draftStores: summaries.filter((store) => !store.is_published).length,
    paidStores: paidStores.length,
    trialStores: summaries.filter((store) => store.subscriptionStatus === "trialing").length,
    freeStores: freeStores.length,
    totalOrders: input.orders.length,
    platformGmv: input.orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + (order.total ?? 0), 0),
    totalProducts: input.products.length,
    lifecycleRisk: summaries.filter((store) => ["at_risk", "reminded", "archived", "pending_delete"].includes(store.lifecycleStatus)).length,
  };
}
