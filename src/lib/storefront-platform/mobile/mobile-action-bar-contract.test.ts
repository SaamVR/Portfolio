import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("mobile action bar is safe-area aware and exposes a 48px primary touch target", () => {
  const contents = readFileSync("src/components/storefront/performance/MobileStorefrontActionBar.tsx", "utf8");
  assert.match(contents, /min-h-\[48px\]/);
  assert.match(contents, /safe-area-inset-bottom/);
  assert.match(contents, /touch-manipulation/);
  assert.match(contents, /focus-visible/);
  assert.doesNotMatch(contents, /hover:/);
});
