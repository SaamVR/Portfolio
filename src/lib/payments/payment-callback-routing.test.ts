import test from "node:test";
import assert from "node:assert/strict";
import { isBypassedPath } from "@/proxy-middleware";

test("generic payment callbacks bypass tenant storefront rewrites", () => {
  assert.equal(isBypassedPath("/payment/callback", true), true);
  assert.equal(isBypassedPath("/payment/callback", false), true);
});

test("legacy bKash callbacks remain bypassed for in-flight compatibility", () => {
  assert.equal(isBypassedPath("/bkash/callback", true), true);
});
