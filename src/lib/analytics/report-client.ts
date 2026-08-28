import { supabase } from "@/integrations/supabase/client";
import type { AnalyticsReportSummary, AnalyticsStoreSummary } from "@/lib/analytics/report";

export type BlogAnalyticsSummary = {
  slug: string;
  views: number;
  ctaClicks: number;
  productViews: number;
  carts: number;
  checkouts: number;
  orders: number;
  revenue: number;
};

export type AuthoritativeAnalyticsReport = {
  summary: AnalyticsReportSummary;
  storeSummaries: Array<Omit<AnalyticsStoreSummary, "label">>;
  blogArticles: BlogAnalyticsSummary[];
};

export const EMPTY_ANALYTICS_REPORT: AnalyticsReportSummary = {
  visitors: 0, sessions: 0, searches: 0, pageViews: 0, productViews: 0,
  addToCart: 0, checkoutStarts: 0, purchases: 0, revenue: 0, netSales: 0,
  refundedAmount: 0, averageOrderValue: 0, visitorToPurchaseRate: 0,
  cartToCheckoutRate: 0, checkoutCompletionRate: 0, wishlistAdds: 0,
  repeatCustomers: 0, topSources: [], topMediums: [], topCampaigns: [],
  topProfitableChannels: [], topSearches: [], zeroResultSearches: [],
  topProducts: [], topPages: [], funnel: [
    { label: "Visitors", value: 0 },
    { label: "Product Views", value: 0, rate: 0 },
    { label: "Add to Cart", value: 0, rate: 0 },
    { label: "Checkout Starts", value: 0, rate: 0 },
    { label: "Purchases", value: 0, rate: 0 },
  ],
};

export async function fetchAuthoritativeAnalyticsReport(storeIds: string[], startIso: string, endIso: string) {
  const { data, error } = await (supabase as any).rpc("get_store_analytics_report", {
    _store_ids: storeIds,
    _start_at: startIso,
    _end_at: endIso,
  });
  if (error) throw error;
  if (!data || typeof data !== "object") throw new Error("Analytics report returned no authoritative payload.");
  return data as AuthoritativeAnalyticsReport;
}

export function labelAnalyticsStoreSummaries(
  summaries: AuthoritativeAnalyticsReport["storeSummaries"],
  labels: Record<string, string>,
): AnalyticsStoreSummary[] {
  return summaries.map((summary) => ({ ...summary, label: labels[summary.storeId] || summary.storeId }));
}
