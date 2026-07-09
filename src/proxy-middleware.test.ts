import test from "node:test";
import assert from "node:assert/strict";
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
  assert.equal(resolveSubdomainStoreSlug("threadbd.stores.example.com", routingEnv), "threadbd");
  assert.equal(resolveSubdomainStoreSlug("fresh-food.commerce.example.com", routingEnv), "fresh-food");
  assert.equal(resolveSubdomainStoreSlug("nested.threadbd.stores.example.com", routingEnv), null);
});

test("platform paths bypass tenant rewrites on tenant domains", () => {
  for (const path of ["/admin", "/admin/products", "/api/orders/create", "/auth", "/bkash/callback", "/plans", "/signup", "/stores/demo"]) {
    assert.equal(isBypassedPath(path), true, `${path} should bypass tenant rewriting`);
  }

  assert.equal(isBypassedPath("/shop"), false);
  assert.equal(isBypassedPath("/product/classic-shirt"), false);
});

test("tenant paths rewrite into the store route shape", () => {
  assert.equal(getTenantRewritePath("threadbd", "/"), "/stores/threadbd");
  assert.equal(getTenantRewritePath("threadbd", "/shop"), "/stores/threadbd/shop");
  assert.equal(getTenantRewritePath("threadbd", "/about-us"), "/stores/threadbd/about-us");
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

test("custom domain lookup retries uncached after a cached miss", async () => {
  const calls: Array<RequestInit & { next?: { revalidate?: number } } | undefined> = [];

  const slug = await resolveCustomDomainStoreSlug("fresh.example-store.com", async (_hostname, init) => {
    calls.push(init);
    return calls.length === 1 ? null : "fresh-store";
  });

  assert.equal(slug, "fresh-store");
  assert.deepEqual(calls, [{ next: { revalidate: 300 } }, { cache: "no-store" }]);
});
