import test from "node:test";
import assert from "node:assert/strict";
import { getPreferredRequestHost, normalizeRequestHost } from "@/lib/platform/request-host";

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
