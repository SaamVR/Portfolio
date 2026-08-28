import { readFileSync } from "node:fs";
import { describe, expect, it } from "@/test/test-utils";

describe("analytics completeness contract", () => {
  it("keeps merchant reports on the authoritative aggregation boundary", () => {
    const analytics = readFileSync(new URL("../../views/admin/Analytics.tsx", import.meta.url), "utf8");
    const blog = readFileSync(new URL("../../views/admin/BlogPerformance.tsx", import.meta.url), "utf8");
    const source = `${analytics}\n${blog}`;
    expect(source).toContain("fetchAuthoritativeAnalyticsReport");
    expect(source).not.toMatch(/\.limit\((?:5000|10000)\)/);
    expect(source).not.toContain('.from("store_analytics_events")');
    expect(source).not.toContain('.from("store_revenue_events")');
  });

  it("keeps the database report caller-bound", () => {
    const sql = readFileSync(new URL("../../../supabase/migrations/20260828193000_complete_merchant_analytics_reporting.sql", import.meta.url), "utf8");
    expect(sql).toContain("SECURITY INVOKER");
    expect(sql).toContain("can_manage_store(requested.store_id, auth.uid())");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.get_store_analytics_report");
    expect(sql).not.toContain("LIMIT 5000");
    expect(sql).not.toContain("LIMIT 10000");
  });
});
