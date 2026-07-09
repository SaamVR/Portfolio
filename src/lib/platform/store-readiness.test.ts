import { describe, expect, it } from "@/test/test-utils";
import { buildStoreReadinessScore } from "@/lib/platform/store-readiness";

describe("buildStoreReadinessScore", () => {
  it("awards a full score only when all launch checks pass", () => {
    const readiness = buildStoreReadinessScore({
      storePublished: true,
      storeDescription: "A polished store description with enough detail for customers and search.",
      logoConfigured: true,
      productTotal: 5,
      featuredTotal: 1,
      paymentConfigured: true,
      contactConfigured: true,
      customPageTotal: 1,
      visibleHomepageBlocks: 3,
    });

    expect(readiness.score).toBe(100);
    expect(readiness.items.every((item) => item.done)).toBe(true);
  });

  it("keeps incomplete stores below sellable readiness", () => {
    const readiness = buildStoreReadinessScore({
      storePublished: false,
      storeDescription: "Too short",
      logoConfigured: false,
      productTotal: 2,
      featuredTotal: 0,
      paymentConfigured: false,
      contactConfigured: true,
      customPageTotal: 0,
      visibleHomepageBlocks: 2,
    });

    expect(readiness.score).toBe(10);
    expect(readiness.items.some((item) => !item.done && item.label === "Payment method configured")).toBe(true);
  });
});
