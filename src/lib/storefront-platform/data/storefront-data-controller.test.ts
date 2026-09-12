import assert from "node:assert/strict";
import test from "node:test";
import { buildStorefrontDataRequestKey, createStorefrontDataController } from "@/lib/storefront-platform/data/storefront-data-controller";

test("request controller collapses identical concurrent storefront reads", async () => {
  let storeCalls = 0;
  const controller = createStorefrontDataController({
    async loadStore() { storeCalls += 1; return { id: "store-1" }; },
    async loadProducts() { return []; },
    async searchProducts() { return []; },
  });

  const args = { slug: "demo", requestedPageSlug: "/shop" };
  const [left, right] = await Promise.all([controller.loadStore(args), controller.loadStore(args)]);
  assert.deepEqual(left, right);
  assert.equal(storeCalls, 1);
});

test("product request keys normalize id ordering but keep preview state isolated", () => {
  const publicA = buildStorefrontDataRequestKey("products", { storeId: "store-1", ids: ["b", "a"] });
  const publicB = buildStorefrontDataRequestKey("products", { storeId: "store-1", ids: ["a", "b"] });
  const preview = buildStorefrontDataRequestKey("products", { storeId: "store-1", ids: ["a", "b"], previewToken: "secret" });
  assert.equal(publicA, publicB);
  assert.notEqual(publicA, preview);
});

test("failed reads are evicted so a retry can recover", async () => {
  let calls = 0;
  const controller = createStorefrontDataController({
    async loadStore() {
      calls += 1;
      if (calls === 1) throw new Error("temporary");
      return { id: "store-1" };
    },
    async loadProducts() { return []; },
    async searchProducts() { return []; },
  });
  await assert.rejects(() => controller.loadStore({ storeId: "store-1" }), /temporary/);
  assert.deepEqual(await controller.loadStore({ storeId: "store-1" }), { id: "store-1" });
  assert.equal(calls, 2);
});
