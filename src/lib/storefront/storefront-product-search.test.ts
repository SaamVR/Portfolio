import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  dedupeStorefrontSearchResults,
  rankStorefrontSearchResults,
  shouldUseExternalStorefrontSearch,
} from "@/lib/storefront/storefront-product-search";

describe("storefront product search helpers", () => {
  test("dedupes identical product results by id", () => {
    const deduped = dedupeStorefrontSearchResults([
      { id: "p1", store_id: "s1", name: "Alpha Tee", price: 10, original_price: 20, category: "Men", type: "T-Shirt" },
      { id: "p1", store_id: "s1", name: "Alpha Tee", price: 10, original_price: 20, category: "Men", type: "T-Shirt" },
      { id: "p2", store_id: "s1", name: "Beta Polo", price: 15, original_price: null, category: "Men", type: "Polo" },
    ]);

    assert.equal(deduped.length, 2);
    assert.deepEqual(deduped.map((item) => item.id), ["p1", "p2"]);
  });

  test("dedupes fallback-identical rows without ids", () => {
    const deduped = dedupeStorefrontSearchResults([
      { id: "", store_id: "s1", name: "Alpha Tee", price: 10, original_price: 20, category: "Men", type: "T-Shirt" },
      { id: "", store_id: "s1", name: "Alpha Tee", price: 10, original_price: 20, category: "Men", type: "T-Shirt" },
      { id: "", store_id: "s1", name: "Alpha Tee", price: 12, original_price: 20, category: "Men", type: "T-Shirt" },
    ]);

    assert.equal(deduped.length, 2);
    assert.deepEqual(deduped.map((item) => item.price), [10, 12]);
  });

  test("keeps exact phrase hits ahead of weaker extra matches", () => {
    const ranked = rankStorefrontSearchResults([
      {
        id: "p1",
        store_id: "s1",
        name: "Premium Urban Drop Shoulder",
        description: "Heavy cotton oversized tee",
        similarity_score: 0.91,
        text_rank: 0.72,
      },
      {
        id: "p2",
        store_id: "s1",
        name: "Urban Shoulder Tee",
        description: "Premium drop fit",
        similarity_score: 0.34,
        text_rank: 0.1,
      },
      {
        id: "p3",
        store_id: "s1",
        name: "Weekend Relax Tee",
        description: "Premium urban streetwear",
        similarity_score: 0.19,
        text_rank: 0.04,
      },
    ], "Premium Urban Drop Shoulder");

    assert.deepEqual(ranked.map((item) => item.id), ["p1"]);
  });

  test("keeps strong multi-token matches when exact phrase winners exist", () => {
    const ranked = rankStorefrontSearchResults([
      {
        id: "p1",
        store_id: "s1",
        name: "Premium Urban Drop Shoulder",
        description: "Heavy cotton oversized tee",
        similarity_score: 0.91,
        text_rank: 0.72,
      },
      {
        id: "p2",
        store_id: "s1",
        name: "Premium Urban Drop Shoulder Hoodie",
        description: "Same silhouette in fleece",
        similarity_score: 0.74,
        text_rank: 0.41,
      },
      {
        id: "p3",
        store_id: "s1",
        name: "Relaxed Weekend Hoodie",
        description: "Urban premium layering piece",
        similarity_score: 0.2,
        text_rank: 0.05,
      },
    ], "Premium Urban Drop Shoulder");

    assert.deepEqual(ranked.map((item) => item.id), ["p1", "p2"]);
  });

  test("reports external seam disabled when no provider env is configured", () => {
    const originalHost = process.env.TYPESENSE_HOST;
    const originalSearchKey = process.env.TYPESENSE_SEARCH_API_KEY;
    const originalAdminKey = process.env.TYPESENSE_ADMIN_API_KEY;

    delete process.env.TYPESENSE_HOST;
    delete process.env.TYPESENSE_SEARCH_API_KEY;
    delete process.env.TYPESENSE_ADMIN_API_KEY;

    assert.equal(shouldUseExternalStorefrontSearch(), false);

    if (originalHost !== undefined) process.env.TYPESENSE_HOST = originalHost;
    if (originalSearchKey !== undefined) process.env.TYPESENSE_SEARCH_API_KEY = originalSearchKey;
    if (originalAdminKey !== undefined) process.env.TYPESENSE_ADMIN_API_KEY = originalAdminKey;
  });
});
