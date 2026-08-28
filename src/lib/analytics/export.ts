import type { AnalyticsReportEvent, AnalyticsReportSummary, AnalyticsStoreSummary } from "@/lib/analytics/report";

function escapeCsv(value: unknown) {
  if (value == null) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildAnalyticsCsv(
  events: AnalyticsReportEvent[],
  storeLabels: Record<string, string> = {},
) {
  const headers = [
    "store_id", "store_label", "event_name", "visitor_id", "session_id",
    "traffic_source", "traffic_medium", "traffic_campaign", "search_query",
    "product_id", "quantity", "value", "page_type", "page_path",
    "event_timestamp", "metadata",
  ];
  const lines = [
    headers.join(","),
    ...events.map((event) => [
      escapeCsv(event.store_id ?? ""),
      escapeCsv(storeLabels[event.store_id ?? ""] ?? ""),
      escapeCsv(event.event_name), escapeCsv(event.visitor_id ?? ""),
      escapeCsv(event.session_id ?? ""), escapeCsv(event.traffic_source ?? ""),
      escapeCsv(event.traffic_medium ?? ""), escapeCsv(event.traffic_campaign ?? ""),
      escapeCsv(event.search_query ?? ""), escapeCsv(event.product_id ?? ""),
      escapeCsv(event.quantity ?? ""), escapeCsv(event.value ?? ""),
      escapeCsv(event.page_type ?? ""), escapeCsv(event.page_path ?? ""),
      escapeCsv(event.event_timestamp ?? ""), escapeCsv(event.metadata ?? {}),
    ].join(",")),
  ];
  return lines.join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadAnalyticsCsv(
  filename: string,
  events: AnalyticsReportEvent[],
  storeLabels: Record<string, string> = {},
) {
  downloadCsv(filename, buildAnalyticsCsv(events, storeLabels));
}

type SummaryCsvRow = [string, string, string, string, string, unknown];

export function buildAnalyticsSummaryCsv(
  report: AnalyticsReportSummary,
  storeSummaries: AnalyticsStoreSummary[] = [],
) {
  const rows: SummaryCsvRow[] = [];
  const add = (section: string, metric: string, value: unknown, label = "", storeId = "", storeLabel = "") =>
    rows.push([section, storeId, storeLabel, metric, label, value]);

  const scalarMetrics: Array<[string, number]> = [
    ["visitors", report.visitors], ["sessions", report.sessions],
    ["searches", report.searches], ["page_views", report.pageViews],
    ["product_views", report.productViews], ["add_to_cart", report.addToCart],
    ["checkout_starts", report.checkoutStarts], ["purchases", report.purchases],
    ["revenue", report.revenue], ["net_sales", report.netSales],
    ["refunded_amount", report.refundedAmount], ["average_order_value", report.averageOrderValue],
    ["visitor_to_purchase_rate", report.visitorToPurchaseRate],
    ["cart_to_checkout_rate", report.cartToCheckoutRate],
    ["checkout_completion_rate", report.checkoutCompletionRate],
    ["wishlist_adds", report.wishlistAdds], ["repeat_customers", report.repeatCustomers],
  ];
  scalarMetrics.forEach(([metric, value]) => add("summary", metric, value));

  const dimensions: Array<[string, Array<{ label: string; value: number }>]> = [
    ["source", report.topSources], ["medium", report.topMediums],
    ["campaign", report.topCampaigns], ["profitable_channel", report.topProfitableChannels],
    ["search", report.topSearches], ["zero_result_search", report.zeroResultSearches],
    ["page", report.topPages],
  ];
  dimensions.forEach(([section, items]) =>
    items.forEach((item) => add(section, "count", item.value, item.label)));
  report.funnel.forEach((item) => add("funnel", "value", item.value, item.label));
  report.topProducts.forEach((item) => add(
    "product", "metrics",
    { views: item.views, carts: item.carts, wishlists: item.wishlists, purchases: item.purchases, revenue: item.revenue, conversionRate: item.conversionRate },
    item.label, item.productId,
  ));
  storeSummaries.forEach((store) => {
    const values = {
      visitors: store.visitors, sessions: store.sessions, searches: store.searches,
      pageViews: store.pageViews, addToCart: store.addToCart,
      checkoutStarts: store.checkoutStarts, purchases: store.purchases, revenue: store.revenue,
    };
    Object.entries(values).forEach(([metric, value]) =>
      add("store", metric, value, "", store.storeId, store.label));
  });
  return [
    ["section", "store_id", "store_label", "metric", "label", "value"].join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");
}

export function downloadAnalyticsSummaryCsv(
  filename: string,
  report: AnalyticsReportSummary,
  storeSummaries: AnalyticsStoreSummary[] = [],
) {
  downloadCsv(filename, buildAnalyticsSummaryCsv(report, storeSummaries));
}
