import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { proxy, getStoreSlugFromStorefrontPath } from "@/proxy-middleware";
import { getStorePreviewCookieName } from "@/lib/cms/store-preview-constants";

const token = "11111111-1111-4111-8111-111111111111";

test("store preview routing identifies only tenant storefront paths", () => {
  assert.equal(getStoreSlugFromStorefrontPath("/stores/threadbd"), "threadbd");
  assert.equal(getStoreSlugFromStorefrontPath("/stores/threadbd/shop"), "threadbd");
  assert.equal(getStoreSlugFromStorefrontPath("/admin/stores/threadbd"), null);
  assert.equal(getStorePreviewCookieName("Thread-BD"), "ezcomo_store_preview_thread-bd");
});

test("an explicit preview token becomes a private per-store preview session", async () => {
  const response = await proxy(new NextRequest(`https://ezcomo.shop/stores/threadbd?preview=${token}`));

  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");

  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /ezcomo_store_preview_threadbd=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=lax/i);
  assert.match(setCookie, /Path=\/(?:;|$)/i);
});

test("preview navigation is internally rewritten with the stored bearer token", async () => {
  const cookieName = getStorePreviewCookieName("threadbd");
  const response = await proxy(new NextRequest("https://ezcomo.shop/stores/threadbd/shop", {
    headers: {
      cookie: `${cookieName}=${token}`,
    },
  }));

  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  const rewrite = response.headers.get("x-middleware-rewrite") ?? "";
  assert.match(rewrite, /\/stores\/threadbd\/shop/);
  assert.match(rewrite, /preview=11111111-1111-4111-8111-111111111111/);
});
