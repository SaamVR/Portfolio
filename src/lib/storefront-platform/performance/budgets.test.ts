import assert from "node:assert/strict";
import test from "node:test";
import { STOREFRONT_PERFORMANCE_BASELINE, evaluateStorefrontClientGraph } from "@/lib/storefront-platform/performance/budgets";

test("measured baseline is accepted without inventing a synthetic pass", () => {
  const baseline = STOREFRONT_PERFORMANCE_BASELINE.clientReferenceGraph;
  assert.equal(evaluateStorefrontClientGraph(baseline).status, "within-baseline");
  assert.equal(STOREFRONT_PERFORMANCE_BASELINE.build.status, "environment-blocked");
});

test("any unexplained client graph increase is flagged for investigation", () => {
  const baseline = STOREFRONT_PERFORMANCE_BASELINE.clientReferenceGraph;
  const result = evaluateStorefrontClientGraph({ ...baseline, gzipBytes: baseline.gzipBytes + 1 });
  assert.equal(result.status, "investigate");
  assert.equal(result.regressions.length, 1);
});
