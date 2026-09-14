import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const routes = [
  "src/app/api/store-payment-settings/route.ts",
  "src/app/api/cart-recovery/lead/route.ts",
  "src/app/api/contact/route.ts",
  "src/app/api/stock-notifications/route.ts",
];

test("public commerce endpoints share publication and plan-state access authority", () => {
  for (const route of routes) {
    const source = readFileSync(path.join(process.cwd(), route), "utf8");
    assert.match(source, /loadStorePlanState/);
    assert.match(source, /canExposePublicStorefront/);
    assert.match(source, /includePublished:\s*true/);
  }
});
