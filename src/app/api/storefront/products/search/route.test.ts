import test, { afterEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import {
  GET,
  storefrontProductSearchRouteDeps,
} from "@/app/api/storefront/products/search/route";

afterEach(() => {
  mock.restoreAll();
});

describe("storefront product search route", () => {
  test("rejects invalid store ids", async () => {
    const response = await GET(
      new Request("https://example.com/api/storefront/products/search?storeId=bad-store&q=shirt"),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid store" });
  });

  test("returns an empty list for blank queries", async () => {
    const searchMock = mock.method(
      storefrontProductSearchRouteDeps,
      "searchStorefrontProducts",
      async () => {
        throw new Error("should not search");
      },
    );

    const response = await GET(
      new Request("https://example.com/api/storefront/products/search?storeId=021c8bad-c54a-4948-b62b-21231d968017&q="),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
    assert.equal(searchMock.mock.callCount(), 0);
  });

  test("passes exact and filtered search params to the search layer", async () => {
    const expected = [{ id: "p1", name: "Essential Everyday T-Shirt" }];
    const searchMock = mock.method(
      storefrontProductSearchRouteDeps,
      "searchStorefrontProducts",
      async () => expected as never,
    );

    const response = await GET(
      new Request("https://example.com/api/storefront/products/search?storeId=021c8bad-c54a-4948-b62b-21231d968017&q=shirt&category=Unisex&type=T-Shirt&min=500&max=1000&sale=1&perPage=12"),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);
    assert.deepEqual(searchMock.mock.calls[0]?.arguments[0], {
      storeId: "021c8bad-c54a-4948-b62b-21231d968017",
      query: "shirt",
      category: "Unisex",
      type: "T-Shirt",
      minPrice: 500,
      maxPrice: 1000,
      saleOnly: true,
      perPage: 12,
    });
  });

  test("returns a 500 when the search layer throws", async () => {
    mock.method(
      storefrontProductSearchRouteDeps,
      "searchStorefrontProducts",
      async () => {
        throw new Error("boom");
      },
    );

    const response = await GET(
      new Request("https://example.com/api/storefront/products/search?storeId=021c8bad-c54a-4948-b62b-21231d968017&q=shirt"),
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Failed to search storefront products" });
  });
});
