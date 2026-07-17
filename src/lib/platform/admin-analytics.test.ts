import { describe, expect, it } from "@/test/test-utils";
import { buildPlatformOverviewStats, buildStorePlatformSummaries, type PlatformAnalyticsInput } from "@/lib/platform/admin-analytics";

const input: PlatformAnalyticsInput = {
  stores: [
    { id: "store-a", owner_id: "owner-alpha", name: "Alpha", slug: "alpha", is_published: true, updated_at: "2026-07-01" },
    { id: "store-b", owner_id: "owner-beta", name: "Beta", slug: "beta", is_published: false, updated_at: "2026-06-01" },
  ],
  plans: [
    { id: "basic", name: "Basic", monthly_price: 0 },
    { id: "advanced", name: "Advanced", monthly_price: 1490 },
  ],
  subscriptions: [
    { store_id: "store-a", plan_id: "advanced", status: "active" },
    { store_id: "store-b", plan_id: "basic", status: "trialing" },
  ],
  orders: [
    { store_id: "store-a", status: "delivered", total: 1200 },
    { store_id: "store-a", status: "cancelled", total: 500 },
    { store_id: "store-b", status: "confirmed", total: 700 },
  ],
  products: [{ store_id: "store-a" }, { store_id: "store-a" }, { store_id: "store-b" }],
  pages: [
    { store_id: "store-a", slug: "/", is_homepage: true },
    { store_id: "store-a", slug: "/about", is_homepage: false },
    { store_id: "store-b", slug: "/landing", is_homepage: false },
  ],
  blocks: [
    { store_id: "store-a", is_visible: true },
    { store_id: "store-a", is_visible: false },
    { store_id: "store-b", is_visible: true },
  ],
  memberships: [
    { store_id: "store-a", user_id: "owner-alpha", role: "owner" },
    { store_id: "store-a", user_id: "staff-alpha", role: "editor" },
    { store_id: "store-b", user_id: "owner-beta", role: "owner" },
  ],
  lifecycleStates: [
    { store_id: "store-a", lifecycle_status: "active", last_activity_at: "2026-07-02" },
    { store_id: "store-b", lifecycle_status: "at_risk", last_activity_at: "2026-05-01" },
  ],
};

describe("platform admin analytics", () => {
  it("builds per-store summaries from existing platform tables", () => {
    const summaries = buildStorePlatformSummaries(input);
    const alpha = summaries.find((store) => store.id === "store-a");
    const beta = summaries.find((store) => store.id === "store-b");

    expect(alpha?.planName).toBe("Advanced");
    expect(alpha?.revenue).toBe(1200);
    expect(alpha?.customPageTotal).toBe(1);
    expect(alpha?.visibleBlockTotal).toBe(1);
    expect(alpha?.memberTotal).toBe(2);
    expect(alpha?.hasHomepage).toBe(true);
    expect(beta?.hasHomepage).toBe(false);
  });

  it("builds platform overview totals without counting cancelled GMV", () => {
    const summaries = buildStorePlatformSummaries(input);
    const overview = buildPlatformOverviewStats(summaries, input);

    expect(overview.totalStores).toBe(2);
    expect(overview.publishedStores).toBe(1);
    expect(overview.paidStores).toBe(1);
    expect(overview.trialStores).toBe(1);
    expect(overview.platformGmv).toBe(1900);
    expect(overview.lifecycleRisk).toBe(1);
  });
});
