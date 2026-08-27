import test from "node:test";
import assert from "node:assert/strict";
import { setDomainRoutingKvAdapter } from "@/lib/domain-routing-kv";
import {
  getBaseDomains,
  getTenantRewritePath,
  isBypassedPath,
  normalizeHost,
  resolveCustomDomainStoreSlug,
  resolveStoreSlug,
  resolveSubdomainStoreSlug,
} from "@/proxy-middleware";

const routingEnv = {
  CMS_ROOT_DOMAIN: "commerce.example.com",
  STORE_SUBDOMAIN_BASE_DOMAIN: "stores.example.com",
  SITE_URL: "https://commerce.example.com",
  NEXT_PUBLIC_CMS_ROOT_DOMAIN: "commerce.example.com",
  NEXT_PUBLIC_STORE_SUBDOMAIN_BASE_DOMAIN: "stores.example.com",
  NEXT_PUBLIC_SITE_URL: "https://commerce.example.com",
};

test("tenant routing helpers normalize hosts and base domains", () => {
  assert.equal(normalizeHost("https://SHOP.Stores.Example.com:443/path"), "shop.stores.example.com");
  assert.deepEqual(getBaseDomains(routingEnv), ["commerce.example.com", "stores.example.com", "localhost"]);
});

test("root and www base domains stay on the platform app", () => {
  assert.equal(resolveSubdomainStoreSlug("commerce.example.com", routingEnv), null);
  assert.equal(resolveSubdomainStoreSlug("www.commerce.example.com", routingEnv), null);
  assert.equal(resolveSubdomainStoreSlug("stores.example.com", routingEnv), null);
  assert.equal(resolveSubdomainStoreSlug("www.stores.example.com", routingEnv), null);
});

test("single tenant subdomains resolve to store slugs", () => {
  assert.equal(resolveSubdomainStoreSlug("ezcomo.stores.example.com", routingEnv), "ezcomo");
  assert.equal(resolveSubdomainStoreSlug("fresh-food.commerce.example.com", routingEnv), "fresh-food");
  assert.equal(resolveSubdomainStoreSlug("nested.ezcomo.stores.example.com", routingEnv), null);
});

test("platform paths bypass tenant rewrites on tenant domains", () => {
  for (const path of ["/admin", "/admin/products", "/api/orders/create", "/auth", "/bkash/callback", "/plans", "/signup", "/stores/demo"]) {
    assert.equal(isBypassedPath(path, true), true, `${path} should bypass tenant rewriting`);
  }

  assert.equal(isBypassedPath("/shop", true), false);
  assert.equal(isBypassedPath("/product/classic-shirt", true), false);
  assert.equal(isBypassedPath("/order-success", true), false);
});

test("tenant paths rewrite into the store route shape", () => {
  assert.equal(getTenantRewritePath("ezcomo", "/"), "/stores/ezcomo");
  assert.equal(getTenantRewritePath("ezcomo", "/shop"), "/stores/ezcomo/shop");
  assert.equal(getTenantRewritePath("ezcomo", "/about-us"), "/stores/ezcomo/about-us");
  assert.equal(getTenantRewritePath("ezcomo", "/order-success"), "/stores/ezcomo/order-success");
});

test("custom domains resolve only when the custom domain resolver finds a store", async () => {
  const known = await resolveStoreSlug("shop.custom-domain.com", async (hostname) => {
    assert.equal(hostname, "shop.custom-domain.com");
    return "custom-shop";
  });

  const unknown = await resolveStoreSlug("unknown-domain.com", async () => null);

  assert.equal(known, "custom-shop");
  assert.equal(unknown, null);
});

test("localhost never falls through to custom domain lookup", async () => {
  let called = false;
  const local = await resolveStoreSlug("localhost", async () => {
    called = true;
    return "should-not-run";
  });

  assert.equal(local, null);
  assert.equal(called, false);
});

test("custom domain lookup does not retry uncached after a miss", async () => {
  const calls: Array<RequestInit & { next?: { revalidate?: number } } | undefined> = [];

  const slug = await resolveCustomDomainStoreSlug("fresh.example-store.com", async (_hostname, init) => {
    calls.push(init);
    return null;
  });

  assert.equal(slug, null);
  assert.deepEqual(calls, [{ next: { revalidate: 300 } }]);
});

test("invalid custom hosts are rejected before remote lookup", async () => {
  let called = false;

  const slug = await resolveCustomDomainStoreSlug("not a real host", async () => {
    called = true;
    return "should-not-run";
  });

  assert.equal(slug, null);
  assert.equal(called, false);
});

test("kv results short-circuit the database lookup path", async () => {
  const originalAdapterReset = () => setDomainRoutingKvAdapter({
    async get() {
      return null;
    },
    async set() {},
    async delete() {},
  });

  setDomainRoutingKvAdapter({
    async get(hostname) {
      assert.equal(hostname, "www.cached-store.com");
      return { storeSlug: "cached-store" };
    },
    async set() {},
    async delete() {},
  });

  let called = false;
  const slug = await resolveCustomDomainStoreSlug("www.cached-store.com", async () => {
    called = true;
    return "db-store";
  });

  originalAdapterReset();

  assert.equal(slug, "cached-store");
  assert.equal(called, false);
});

test("kv lookup failures fall back to the database lookup path", async () => {
  const originalAdapterReset = () => setDomainRoutingKvAdapter({
    async get() {
      return null;
    },
    async set() {},
    async delete() {},
  });

  setDomainRoutingKvAdapter({
    async get() {
      throw new Error("kv unavailable");
    },
    async set() {},
    async delete() {},
  });

  let called = false;
  const slug = await resolveCustomDomainStoreSlug("www.fallback-store.com", async (hostname, init) => {
    called = true;
    assert.equal(hostname, "www.fallback-store.com");
    assert.deepEqual(init, { next: { revalidate: 300 } });
    return "db-fallback-store";
  });

  originalAdapterReset();

  assert.equal(slug, "db-fallback-store");
  assert.equal(called, true);
});
