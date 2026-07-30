import test from "node:test";
import assert from "node:assert/strict";
import { getEzcomoRequestHostname, getPreferredRequestHost, normalizeRequestHost } from "@/lib/platform/request-host";

test("normalizeRequestHost strips protocol, path, and port", () => {
  assert.equal(normalizeRequestHost("https://XBD.EZComo.shop:443/path"), "xbd.ezcomo.shop");
});

test("getPreferredRequestHost prefers host over x-forwarded-host", () => {
  assert.equal(getPreferredRequestHost({
    host: "xbd.ezcomo.shop",
    forwardedHost: "ecomcms-flax.vercel.app",
  }), "xbd.ezcomo.shop");
});

test("getPreferredRequestHost falls back to forwarded host when host is absent", () => {
  assert.equal(getPreferredRequestHost({
    host: null,
    forwardedHost: "xbd.ezcomo.shop",
  }), "xbd.ezcomo.shop");
});

test("getEzcomoRequestHostname trusts forwarded merchant host only with the proxy secret", () => {
  process.env.EZCOMO_PROXY_SECRET = "proxy-secret";

  const trustedHeaders = new Headers({
    host: "origin.ezcomo.shop",
    "x-ezcomo-hostname": "www.merchant.com",
    "x-ezcomo-proxy-secret": "proxy-secret",
  });
  const untrustedHeaders = new Headers({
    host: "origin.ezcomo.shop",
    "x-ezcomo-hostname": "attacker.example.com",
    "x-ezcomo-proxy-secret": "wrong",
  });

  assert.equal(getEzcomoRequestHostname({ headers: trustedHeaders }), "www.merchant.com");
  assert.equal(getEzcomoRequestHostname({ headers: untrustedHeaders }), "origin.ezcomo.shop");

  delete process.env.EZCOMO_PROXY_SECRET;
});
