import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { POST } from "./route";

afterEach(() => {
  delete process.env.STOREFRONT_SEARCH_WEBHOOK_SECRET;
  delete process.env.BILLING_WEBHOOK_SECRET;
});

function request(secret?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret) headers["x-storefront-search-secret"] = secret;

  return new Request("https://ezcomo.shop/api/search/storefront-sync", {
    method: "POST",
    headers,
    body: JSON.stringify({ storeId: "store_1", action: "upsert", productIds: [] }),
  });
}

test("search sync fails closed when no webhook secret is configured", async () => {
  const response = await POST(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Search sync is not configured" });
});

test("search sync rejects a wrong webhook secret", async () => {
  process.env.STOREFRONT_SEARCH_WEBHOOK_SECRET = "expected-secret";

  const response = await POST(request("wrong-secret"));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});
