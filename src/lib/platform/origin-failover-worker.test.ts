import test from "node:test";
import assert from "node:assert/strict";
import worker from "../../../cloudflare/ezcomo-origin-failover/worker.js";

const EXPECTED = "a".repeat(40);
const STALE = "b".repeat(40);

type FetchCall = {
  hostname: string;
  pathname: string;
  method: string;
  headers: Headers;
};

class MemoryCache {
  private entries = new Map<string, Response>();

  private key(input: unknown) {
    if (typeof input === "string") return input;
    if (input instanceof Request) return input.url;
    return String(input);
  }

  async match(input: unknown) {
    return this.entries.get(this.key(input))?.clone() ?? undefined;
  }

  async put(input: unknown, response: Response) {
    this.entries.set(this.key(input), response.clone());
  }
}

function env(expectedRelease: string | null = EXPECTED) {
  return {
    LB_PROXY_SECRET: "test-lb-secret",
    PLATFORM_DOMAIN: "ezcomo.shop",
    PRIMARY_ORIGIN_HOSTNAME: "primary.test",
    FALLBACK_ORIGIN_HOSTNAME: "fallback.test",
    FAILOVER_TTL_SECONDS: "30",
    RELEASE_PROBE_TTL_SECONDS: "15",
    DEBUG_ORIGIN_HEADER: "1",
    ...(expectedRelease === null ? {} : { EXPECTED_RELEASE_SHA: expectedRelease }),
  };
}

function context() {
  const pending: Promise<unknown>[] = [];
  return {
    ctx: { waitUntil(value: Promise<unknown>) { pending.push(Promise.resolve(value)); } },
    async flush() { await Promise.all(pending); },
  };
}

function request(method = "GET", hostname = "shop.ezcomo.shop") {
  return new Request(`https://${hostname}/stores/sam`, { method });
}

test("origin failover Worker enforces release-aware routing without mutation replay", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalCaches = (globalThis as any).caches;

  async function run(
    fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
    execute: () => Promise<void>,
  ) {
    (globalThis as any).caches = { default: new MemoryCache() };
    (globalThis as any).fetch = fetchImpl;
    await execute();
  }

  try {
    await t.test("preselects the matching fallback before a mutation is dispatched", async () => {
      const calls: FetchCall[] = [];
      await run(async (input) => {
        const req = input instanceof Request ? input : new Request(input);
        const url = new URL(req.url);
        calls.push({ hostname: url.hostname, pathname: url.pathname, method: req.method, headers: req.headers });
        if (url.pathname === "/api/health") {
          return Response.json({ status: "ok", release: url.hostname === "primary.test" ? STALE : EXPECTED });
        }
        assert.equal(url.hostname, "fallback.test");
        return new Response("fallback-ok", { status: 200 });
      }, async () => {
        const state = context();
        const response = await worker.fetch(request("POST"), env(), state.ctx);
        await state.flush();
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("x-ezcomo-origin"), "vercel");
        const shopperCalls = calls.filter((call) => call.pathname !== "/api/health");
        assert.deepEqual(shopperCalls.map((call) => call.hostname), ["fallback.test"]);
        assert.equal(shopperCalls[0]?.headers.get("x-ezcomo-hostname"), "shop.ezcomo.shop");
        assert.equal(shopperCalls[0]?.headers.get("x-ezcomo-lb-secret"), "test-lb-secret");
      });
    });

    await t.test("never replays a mutation after a matching primary transport failure", async () => {
      const calls: FetchCall[] = [];
      await run(async (input) => {
        const req = input instanceof Request ? input : new Request(input);
        const url = new URL(req.url);
        calls.push({ hostname: url.hostname, pathname: url.pathname, method: req.method, headers: req.headers });
        if (url.pathname === "/api/health") return Response.json({ status: "ok", release: EXPECTED });
        if (url.hostname === "primary.test") throw new Error("ambiguous transport failure");
        return new Response("must-not-run", { status: 200 });
      }, async () => {
        const state = context();
        const response = await worker.fetch(request("POST"), env(), state.ctx);
        await state.flush();
        assert.equal(response.status, 502);
        const shopperCalls = calls.filter((call) => call.pathname !== "/api/health");
        assert.deepEqual(shopperCalls.map((call) => call.hostname), ["primary.test"]);
      });
    });

    await t.test("safe reads may retry to a fallback that also proves the expected release", async () => {
      const calls: FetchCall[] = [];
      await run(async (input) => {
        const req = input instanceof Request ? input : new Request(input);
        const url = new URL(req.url);
        calls.push({ hostname: url.hostname, pathname: url.pathname, method: req.method, headers: req.headers });
        if (url.pathname === "/api/health") return Response.json({ status: "ok", release: EXPECTED });
        if (url.hostname === "primary.test") return new Response("primary-down", { status: 503 });
        return new Response("fallback-ok", { status: 200 });
      }, async () => {
        const state = context();
        const response = await worker.fetch(request("GET"), env(), state.ctx);
        await state.flush();
        assert.equal(response.status, 200);
        const shopperCalls = calls.filter((call) => call.pathname !== "/api/health");
        assert.deepEqual(shopperCalls.map((call) => call.hostname), ["primary.test", "fallback.test"]);
      });
    });

    await t.test("fails closed when no healthy origin proves the expected release", async () => {
      let shopperDispatches = 0;
      await run(async (input) => {
        const req = input instanceof Request ? input : new Request(input);
        const url = new URL(req.url);
        if (url.pathname === "/api/health") return Response.json({ status: "ok", release: STALE });
        shopperDispatches += 1;
        return new Response("unexpected", { status: 200 });
      }, async () => {
        const state = context();
        const response = await worker.fetch(request("GET"), env(), state.ctx);
        assert.equal(response.status, 503);
        assert.equal(response.headers.get("x-ezcomo-release-state"), "degraded");
        assert.equal(shopperDispatches, 0);
      });
    });

    await t.test("unset expected release preserves compatibility behavior without release probes", async () => {
      let healthProbes = 0;
      const shopperHosts: string[] = [];
      await run(async (input) => {
        const req = input instanceof Request ? input : new Request(input);
        const url = new URL(req.url);
        if (url.pathname === "/api/health") healthProbes += 1;
        else shopperHosts.push(url.hostname);
        return new Response("primary-ok", { status: 200 });
      }, async () => {
        const state = context();
        const response = await worker.fetch(request("GET"), env(null), state.ctx);
        assert.equal(response.status, 200);
        assert.equal(healthProbes, 0);
        assert.deepEqual(shopperHosts, ["primary.test"]);
      });
    });

    await t.test("release probes are cached instead of repeated for every request", async () => {
      let healthProbes = 0;
      let shopperDispatches = 0;
      await run(async (input) => {
        const req = input instanceof Request ? input : new Request(input);
        const url = new URL(req.url);
        if (url.pathname === "/api/health") {
          healthProbes += 1;
          return Response.json({ status: "ok", release: EXPECTED });
        }
        shopperDispatches += 1;
        return new Response("primary-ok", { status: 200 });
      }, async () => {
        const first = context();
        assert.equal((await worker.fetch(request("GET"), env(), first.ctx)).status, 200);
        await first.flush();
        const second = context();
        assert.equal((await worker.fetch(request("GET"), env(), second.ctx)).status, 200);
        await second.flush();
        assert.equal(healthProbes, 2);
        assert.equal(shopperDispatches, 2);
      });
    });

    await t.test("routes Cloudflare for SaaS vanity hostnames through the trusted origin path", async () => {
      const calls: FetchCall[] = [];
      await run(async (input) => {
        const req = input instanceof Request ? input : new Request(input);
        const url = new URL(req.url);
        calls.push({ hostname: url.hostname, pathname: url.pathname, method: req.method, headers: req.headers });
        if (url.pathname === "/api/health") {
          return Response.json({ status: "ok", release: EXPECTED });
        }
        assert.equal(url.hostname, "primary.test");
        return new Response("merchant-ok", { status: 200 });
      }, async () => {
        const state = context();
        const response = await worker.fetch(request("GET", "shop.merchant-example.com"), env(), state.ctx);
        await state.flush();
        assert.equal(response.status, 200);
        const shopperCalls = calls.filter((call) => call.pathname !== "/api/health");
        assert.deepEqual(shopperCalls.map((call) => call.hostname), ["primary.test"]);
        assert.equal(shopperCalls[0]?.headers.get("x-ezcomo-hostname"), "shop.merchant-example.com");
        assert.equal(shopperCalls[0]?.headers.get("x-forwarded-host"), "shop.merchant-example.com");
        assert.equal(shopperCalls[0]?.headers.get("x-ezcomo-lb-secret"), "test-lb-secret");
      });
    });

    await t.test("routes the SaaS CNAME target through the application origin", async () => {
      const shopperHosts: string[] = [];
      await run(async (input) => {
        const req = input instanceof Request ? input : new Request(input);
        const url = new URL(req.url);
        if (url.pathname === "/api/health") {
          return Response.json({ status: "ok", release: EXPECTED });
        }
        shopperHosts.push(url.hostname);
        return new Response("customers-ok", { status: 200 });
      }, async () => {
        const state = context();
        const response = await worker.fetch(request("GET", "customers.ezcomo.shop"), env(), state.ctx);
        await state.flush();
        assert.equal(response.status, 200);
        assert.deepEqual(shopperHosts, ["primary.test"]);
      });
    });

    await t.test("reserved platform hosts bypass release routing exactly as before", async () => {
      const calls: string[] = [];
      await run(async (input) => {
        const req = input instanceof Request ? input : new Request(input);
        calls.push(req.url);
        return new Response("reserved-ok", { status: 200 });
      }, async () => {
        const state = context();
        const response = await worker.fetch(request("GET", "origin.ezcomo.shop"), env(), state.ctx);
        assert.equal(response.status, 200);
        assert.equal(calls.length, 1);
        assert.equal(new URL(calls[0]!).hostname, "origin.ezcomo.shop");
      });
    });
  } finally {
    (globalThis as any).fetch = originalFetch;
    if (originalCaches === undefined) delete (globalThis as any).caches;
    else (globalThis as any).caches = originalCaches;
  }
});
