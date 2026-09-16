import test from "node:test";
import assert from "node:assert/strict";
import worker from "../../../cloudflare/ezcomo-custom-domain-proxy/worker.js";

function baseEnv(overrides: Record<string, unknown> = {}) {
  return {
    PLATFORM_DOMAIN: "ezcomo.shop",
    PROXY_SECRET: "proxy-secret",
    DOMAIN_ROUTING_KV: {
      async get(key: string, type: string) {
        assert.equal(key, "domain:www.samvr.store");
        assert.equal(type, "json");
        return { storeSlug: "sam" };
      },
    },
    ORIGIN_ROUTER: {
      async fetch() {
        return new Response("router-ok", { status: 200 });
      },
    },
    ...overrides,
  };
}

test("custom-domain proxy forwards active merchant domains through the origin-router service binding", async () => {
  const routedRequests: Request[] = [];
  const env = baseEnv({
    ORIGIN_ROUTER: {
      async fetch(request: Request) {
        routedRequests.push(request);
        return new Response("router-ok", {
          status: 200,
          headers: { "x-router": "origin-failover" },
        });
      },
    },
  });

  const response = await worker.fetch(
    new Request("https://www.samvr.store/products/widget?ref=test"),
    env,
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "router-ok");
  assert.equal(response.headers.get("x-router"), "origin-failover");
  const routedRequest = routedRequests[0];
  assert.ok(routedRequest);
  assert.equal(new URL(routedRequest.url).hostname, "www.samvr.store");
  assert.equal(new URL(routedRequest.url).pathname, "/products/widget");
  assert.equal(routedRequest.headers.get("x-ezcomo-hostname"), "www.samvr.store");
  assert.equal(routedRequest.headers.get("x-ezcomo-store-slug"), "sam");
  assert.equal(routedRequest.headers.get("x-forwarded-host"), "www.samvr.store");
  assert.equal(routedRequest.headers.get("x-ezcomo-proxy-secret"), "proxy-secret");
});


test("custom-domain proxy routes an active apex vanity hostname without www", async () => {
  const routedRequests: Request[] = [];
  const env = baseEnv({
    DOMAIN_ROUTING_KV: {
      async get(key: string, type: string) {
        assert.equal(key, "domain:samvr.store");
        assert.equal(type, "json");
        return { storeSlug: "sam" };
      },
    },
    ORIGIN_ROUTER: {
      async fetch(request: Request) {
        routedRequests.push(request);
        return new Response("apex-ok", { status: 200 });
      },
    },
  });

  const response = await worker.fetch(new Request("https://samvr.store/products/widget"), env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "apex-ok");

  const routedRequest = routedRequests[0];
  assert.ok(routedRequest);
  assert.equal(new URL(routedRequest.url).hostname, "samvr.store");
  assert.equal(routedRequest.headers.get("x-ezcomo-hostname"), "samvr.store");
  assert.equal(routedRequest.headers.get("x-forwarded-host"), "samvr.store");
});

test("custom-domain proxy rejects inactive domains before invoking the origin router", async () => {
  let routerCalls = 0;
  const env = baseEnv({
    DOMAIN_ROUTING_KV: {
      async get() {
        return null;
      },
    },
    ORIGIN_ROUTER: {
      async fetch() {
        routerCalls += 1;
        return new Response("unexpected");
      },
    },
  });

  const response = await worker.fetch(new Request("https://www.samvr.store/"), env);
  assert.equal(response.status, 404);
  assert.equal(await response.text(), "This storefront domain is not active.");
  assert.equal(routerCalls, 0);
});

test("custom-domain proxy fails closed when the origin-router binding is missing", async () => {
  const env = baseEnv({ ORIGIN_ROUTER: undefined });
  const response = await worker.fetch(new Request("https://www.samvr.store/"), env);
  assert.equal(response.status, 500);
  assert.equal(await response.text(), "Origin router service binding is missing.");
});

test("platform hostnames never enter the custom-domain proxy", async () => {
  const response = await worker.fetch(new Request("https://sam.ezcomo.shop/"), baseEnv());
  assert.equal(response.status, 500);
  assert.match(await response.text(), /platform hostname reached the custom-domain proxy/i);
});
