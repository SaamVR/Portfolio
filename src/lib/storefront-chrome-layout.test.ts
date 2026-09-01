import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { resolveStorefrontChromeLayout } from "./storefront-chrome-layout";

const root = process.cwd();

test("storefront chrome reserves measured fixed heights without double-counting static navigation", () => {
  const fixed = resolveStorefrontChromeLayout({
    announcementVisible: true,
    announcementHeight: 44,
    navbarHeight: 66,
    bottomNavHeight: 74,
    navStyle: "sticky",
  });
  assert.deepEqual(fixed, { navbarTop: 44, mainPaddingTop: 110, bottomPadding: 74 });

  const autoHide = resolveStorefrontChromeLayout({
    announcementVisible: true,
    announcementHeight: 64,
    navbarHeight: 66,
    bottomNavHeight: 90,
    navStyle: "hidden",
  });
  assert.deepEqual(autoHide, { navbarTop: 64, mainPaddingTop: 130, bottomPadding: 90 });

  const staticNav = resolveStorefrontChromeLayout({
    announcementVisible: true,
    announcementHeight: 64,
    navbarHeight: 66,
    bottomNavHeight: 0,
    navStyle: "static",
  });
  assert.deepEqual(staticNav, { navbarTop: 64, mainPaddingTop: 64, bottomPadding: 0 });
});

test("dismissed announcement immediately removes its reserved offset and invalid heights fail safe", () => {
  const result = resolveStorefrontChromeLayout({
    announcementVisible: false,
    announcementHeight: 64,
    navbarHeight: 66,
    bottomNavHeight: Number.NaN,
    navStyle: "sticky",
  });
  assert.deepEqual(result, { navbarTop: 0, mainPaddingTop: 66, bottomPadding: 0 });
});

test("shared storefront layout keeps the mobile chrome resilience contract", () => {
  const source = readFileSync(path.resolve(root, "src/components/Layout.tsx"), "utf8");

  assert.doesNotMatch(source, /pt-\[100px\]|announcementVisible \? "pt-\[100px\]"|"pt-16"/);
  assert.match(source, /new ResizeObserver\(measureChrome\)/);
  assert.match(source, /getBoundingClientRect\(\)\.height/);
  assert.match(source, /--storefront-announcement-height/);
  assert.match(source, /height: auto !important;[\s\S]*min-height: 2\.75rem/);
  assert.match(source, /button\[aria-label="Open navigation menu"\][\s\S]*min-width: 2\.75rem/);
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.match(source, /-webkit-line-clamp: 2/);
  assert.match(source, /a\[href\$="\/wishlist"\]/);
  assert.match(source, /transition-property: transform, opacity/);
});
