import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const preflight = readFileSync(
  path.join(process.cwd(), "supabase/tests/commerce_hardening_preflight.sql"),
  "utf8",
);

test("commerce rollout preflight is read-only and covers reconciliation blockers", () => {
  assert.doesNotMatch(preflight, /\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE)\b/i);
  assert.match(preflight, /cart quantity outside 1\.\.99/);
  assert.match(preflight, /duplicate normalized coupon code within store/);
  assert.match(preflight, /analytics owned-reference mismatch/);
  assert.match(preflight, /legacy store-credit return row/);
  assert.match(preflight, /duplicate scheduled recovery touch/);
  assert.match(preflight, /manual-payment order without exactly one legacy transaction reference/);
  assert.match(preflight, /duplicate legacy manual-payment provider\/reference/);
  assert.match(preflight, /commerce hardening preflight failed/);
});
