export type AnalyticsReportEvent = {
  store_id?: string | null;
  event_name: string;
  visitor_id?: string | null;
  session_id?: string | null;
  traffic_source?: string | null;
  traffic_medium?: string | null;
  traffic_campaign?: string | null;
  search_query?: string | null;
  product_id?: string | null;
  value?: number | null;
  quantity?: number | null;
  metadata?: Record<string, unknown> | null;
  page_type?: string | null;
  page_path?: string | null;
  event_timestamp?: string | null;
};

export type AnalyticsProductSummary = {
  productId: string;
  label: string;
  views: number;
  carts: number;
  wishlists: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
};

export type AnalyticsStoreSummary = {
  storeId: string;
  label: string;
  visitors: number;
  sessions: number;
  searches: number;
  pageViews: number;
  addToCart: number;
  checkoutStarts: number;
  purchases: number;
  revenue: number;
};

export type AnalyticsReportSummary = {
  visitors: number;
  sessions: number;
  searches: number;
  pageViews: number;
  productViews: number;
  addToCart: number;
  checkoutStarts: number;
  purchases: number;
  revenue: number;
  netSales: number;
  refundedAmount: number;
  averageOrderValue: number;
  visitorToPurchaseRate: number;
  cartToCheckoutRate: number;
  checkoutCompletionRate: number;
  wishlistAdds: number;
  repeatCustomers: number;
  topSources: Array<{ label: string; value: number }>;
  topMediums: Array<{ label: string; value: number }>;
  topCampaigns: Array<{ label: string; value: number }>;
  topProfitableChannels: Array<{ label: string; value: number }>;
  topSearches: Array<{ label: string; value: number }>;
  zeroResultSearches: Array<{ label: string; value: number }>;
  topProducts: AnalyticsProductSummary[];
  topPages: Array<{ label: string; value: number }>;
  funnel: Array<{ label: string; value: number; rate?: number }>;
};

export type RevenueReportEvent = {
  store_id?: string | null;
  customer_id?: string | null;
  event_type: string;
  gross_amount?: number | null;
  refund_amount?: number | null;
  net_amount?: number | null;
  attribution_source?: string | null;
  attribution_medium?: string | null;
  attribution_campaign?: string | null;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function getProductLabel(event: AnalyticsReportEvent) {
  const label = readString(event.metadata?.productName)
    || readString(event.metadata?.item_name)
    || readString(event.metadata?.name);
  return label || "Unnamed product";
}

export function buildAnalyticsReport(
  events: AnalyticsReportEvent[],
  revenueEvents: RevenueReportEvent[] = [],
): AnalyticsReportSummary {
  const visitors = new Set<string>();
  const sessions = new Set<string>();
  const sourceCounts = new Map<string, number>();
  const mediumCounts = new Map<string, number>();
  const campaignCounts = new Map<string, number>();
  const searchCounts = new Map<string, number>();
  const zeroResultCounts = new Map<string, number>();
  const pageCounts = new Map<string, number>();
  const products = new Map<string, AnalyticsProductSummary>();
  const profitableChannels = new Map<string, number>();
  const customerPurchases = new Map<string, number>();

  let searches = 0;
  let pageViews = 0;
  let productViews = 0;
  let addToCart = 0;
  let checkoutStarts = 0;
  let purchases = 0;
  let revenue = 0;
  let wishlistAdds = 0;
  let netSales = 0;
  let refundedAmount = 0;

  for (const event of events) {
    if (event.visitor_id) visitors.add(event.visitor_id);
    if (event.session_id) sessions.add(event.session_id);

    const source = readString(event.traffic_source) || "direct";
    increment(sourceCounts, source);
    const medium = readString(event.traffic_medium);
    if (medium) increment(mediumCounts, medium);
    const campaign = readString(event.traffic_campaign);
    if (campaign) increment(campaignCounts, campaign);

    const pageLabel = readString(event.page_path) || readString(event.page_type);
    if (pageLabel) {
      increment(pageCounts, pageLabel);
    }

    if (event.event_name === "page_view") pageViews += 1;
    if (event.event_name === "view_item") productViews += 1;
    if (event.event_name === "add_to_cart") addToCart += 1;
    if (event.event_name === "begin_checkout") checkoutStarts += 1;
    if (event.event_name === "purchase") {
      purchases += 1;
      revenue += readNumber(event.value);
    }
    if (event.event_name === "add_to_wishlist") wishlistAdds += 1;

    const search = readString(event.search_query).toLowerCase();
    if (search && event.event_name === "search") {
      searches += 1;
      increment(searchCounts, search);
      if (readNumber(event.metadata?.resultsCount) === 0) {
        increment(zeroResultCounts, search);
      }
    }

    const productId = readString(event.product_id);
    if (productId) {
      const current = products.get(productId) ?? {
        productId,
        label: getProductLabel(event),
        views: 0,
        carts: 0,
        wishlists: 0,
        purchases: 0,
        revenue: 0,
        conversionRate: 0,
      };

      current.label = current.label || getProductLabel(event);
      if (event.event_name === "view_item") current.views += 1;
      if (event.event_name === "add_to_cart") current.carts += 1;
      if (event.event_name === "add_to_wishlist") current.wishlists += 1;
      if (event.event_name === "purchase_item") {
        current.purchases += readNumber(event.quantity) || 1;
        current.revenue += readNumber(event.value);
      }
      products.set(productId, current);
    }
  }

  for (const revenueEvent of revenueEvents) {
    netSales += readNumber(revenueEvent.net_amount);
    refundedAmount += readNumber(revenueEvent.refund_amount);

    const source = readString(revenueEvent.attribution_source) || "direct";
    const medium = readString(revenueEvent.attribution_medium);
    const channelLabel = medium ? `${source} / ${medium}` : source;
    increment(profitableChannels, channelLabel, readNumber(revenueEvent.net_amount));

    const customerId = readString(revenueEvent.customer_id);
    if (customerId && revenueEvent.event_type === "sale") {
      customerPurchases.set(customerId, (customerPurchases.get(customerId) ?? 0) + 1);
    }
  }

  const sortEntries = (map: Map<string, number>, limit = 8) =>
    [...map.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([label, value]) => ({ label, value }));

  const topProducts = [...products.values()]
    .map((product) => ({
      ...product,
      conversionRate: product.views > 0 ? product.purchases / product.views : 0,
    }))
    .sort((left, right) => {
      const rightScore = right.revenue || right.carts || right.views;
      const leftScore = left.revenue || left.carts || left.views;
      return rightScore - leftScore;
    })
    .slice(0, 10);

  const funnel = [
    { label: "Visitors", value: visitors.size },
    { label: "Product Views", value: productViews, rate: visitors.size > 0 ? productViews / visitors.size : 0 },
    { label: "Add to Cart", value: addToCart, rate: productViews > 0 ? addToCart / productViews : 0 },
    { label: "Checkout Starts", value: checkoutStarts, rate: addToCart > 0 ? checkoutStarts / addToCart : 0 },
    { label: "Purchases", value: purchases, rate: checkoutStarts > 0 ? purchases / checkoutStarts : 0 },
  ];

  return {
    visitors: visitors.size,
    sessions: sessions.size,
    searches,
    pageViews,
    productViews,
    addToCart,
    checkoutStarts,
    purchases,
    revenue,
    netSales,
    refundedAmount,
    averageOrderValue: purchases > 0 ? revenue / purchases : 0,
    visitorToPurchaseRate: visitors.size > 0 ? purchases / visitors.size : 0,
    cartToCheckoutRate: addToCart > 0 ? checkoutStarts / addToCart : 0,
    checkoutCompletionRate: checkoutStarts > 0 ? purchases / checkoutStarts : 0,
    wishlistAdds,
    repeatCustomers: [...customerPurchases.values()].filter((count) => count > 1).length,
    topSources: sortEntries(sourceCounts, 6),
    topMediums: sortEntries(mediumCounts, 6),
    topCampaigns: sortEntries(campaignCounts, 6),
    topProfitableChannels: sortEntries(profitableChannels, 6),
    topSearches: sortEntries(searchCounts, 8),
    zeroResultSearches: sortEntries(zeroResultCounts, 8),
    topProducts,
    topPages: sortEntries(pageCounts, 8),
    funnel,
  };
}

export function buildAnalyticsStoreSummaries(
  events: AnalyticsReportEvent[],
  revenueEventsOrLabels: RevenueReportEvent[] | Record<string, string> = [],
  maybeLabels: Record<string, string> = {},
): AnalyticsStoreSummary[] {
  const revenueEvents = Array.isArray(revenueEventsOrLabels) ? revenueEventsOrLabels : [];
  const labels = Array.isArray(revenueEventsOrLabels) ? maybeLabels : revenueEventsOrLabels;
  const byStore = new Map<string, AnalyticsReportEvent[]>();
  const revenueByStore = new Map<string, RevenueReportEvent[]>();

  for (const event of events) {
    const storeId = readString(event.store_id);
    if (!storeId) continue;
    const current = byStore.get(storeId) ?? [];
    current.push(event);
    byStore.set(storeId, current);
  }

  for (const event of revenueEvents) {
    const storeId = readString(event.store_id);
    if (!storeId) continue;
    const current = revenueByStore.get(storeId) ?? [];
    current.push(event);
    revenueByStore.set(storeId, current);
  }

  return [...byStore.entries()]
    .map(([storeId, storeEvents]) => {
      const summary = buildAnalyticsReport(storeEvents, revenueByStore.get(storeId) ?? []);
      return {
        storeId,
        label: labels[storeId] || storeId,
        visitors: summary.visitors,
        sessions: summary.sessions,
        searches: storeEvents.filter((event) => event.event_name === "search").length,
        pageViews: summary.pageViews,
        addToCart: summary.addToCart,
        checkoutStarts: summary.checkoutStarts,
        purchases: summary.purchases,
        revenue: summary.revenue,
      } satisfies AnalyticsStoreSummary;
    })
    .sort((left, right) => {
      const rightScore = right.revenue || right.purchases || right.addToCart || right.pageViews;
      const leftScore = left.revenue || left.purchases || left.addToCart || left.pageViews;
      return rightScore - leftScore;
    });
}
