import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { getEzcomoRequestHostname, getEzcomoRequestStoreSlug, getPreferredRequestHost, normalizeRequestHost } from "@/lib/platform/request-host";

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

test("getEzcomoRequestHostname trusts Cloudflare LB host only when its secret hash matches", () => {
  const lbSecret = "lb-secret-with-enough-entropy-for-test";
  process.env.EZCOMO_LB_PROXY_SECRET_SHA256 = createHash("sha256").update(lbSecret).digest("hex");

  const trustedHeaders = new Headers({
    host: "ecomcms-xjw4.onrender.com",
    "x-ezcomo-hostname": "merchant.ezcomo.shop",
    "x-ezcomo-lb-secret": lbSecret,
  });
  const untrustedHeaders = new Headers({
    host: "ecomcms-xjw4.onrender.com",
    "x-ezcomo-hostname": "attacker.example.com",
    "x-ezcomo-lb-secret": "wrong",
  });

  assert.equal(getEzcomoRequestHostname({ headers: trustedHeaders }), "merchant.ezcomo.shop");
  assert.equal(getEzcomoRequestHostname({ headers: untrustedHeaders }), "ecomcms-xjw4.onrender.com");

  delete process.env.EZCOMO_LB_PROXY_SECRET_SHA256;
});

test("getEzcomoRequestStoreSlug trusts store slug only with the proxy secret", () => {
  process.env.EZCOMO_PROXY_SECRET = "proxy-secret";

  const trustedHeaders = new Headers({
    host: "origin.ezcomo.shop",
    "x-ezcomo-store-slug": "merchant-noir",
    "x-ezcomo-proxy-secret": "proxy-secret",
  });
  const untrustedHeaders = new Headers({
    host: "origin.ezcomo.shop",
    "x-ezcomo-store-slug": "attacker/shop",
    "x-ezcomo-proxy-secret": "wrong",
  });

  assert.equal(getEzcomoRequestStoreSlug({ headers: trustedHeaders }), "merchant-noir");
  assert.equal(getEzcomoRequestStoreSlug({ headers: untrustedHeaders }), null);

  delete process.env.EZCOMO_PROXY_SECRET;
});

test("Cloudflare LB secret does not authorize a forwarded store slug", () => {
  const lbSecret = "lb-secret-with-enough-entropy-for-test";
  process.env.EZCOMO_LB_PROXY_SECRET_SHA256 = createHash("sha256").update(lbSecret).digest("hex");

  const headers = new Headers({
    host: "ecomcms-xjw4.onrender.com",
    "x-ezcomo-store-slug": "merchant-noir",
    "x-ezcomo-lb-secret": lbSecret,
  });

  assert.equal(getEzcomoRequestStoreSlug({ headers }), null);

  delete process.env.EZCOMO_LB_PROXY_SECRET_SHA256;
});

test("getEzcomoRequestStoreSlug rejects malformed slugs even when the proxy secret matches", () => {
  process.env.EZCOMO_PROXY_SECRET = "proxy-secret";

  const invalidHeaders = new Headers({
    host: "origin.ezcomo.shop",
    "x-ezcomo-store-slug": "merchant.noir",
    "x-ezcomo-proxy-secret": "proxy-secret",
  });

  assert.equal(getEzcomoRequestStoreSlug({ headers: invalidHeaders }), null);

  delete process.env.EZCOMO_PROXY_SECRET;
});
