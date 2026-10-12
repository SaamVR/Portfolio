import { webcrypto } from "node:crypto";
if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
import assert from "node:assert/strict";
import test from "node:test";
import { SCENARIOS, validateCommand, qualifyLead, crmContract, runSyntheticWorkflow } from "../functions/lib/engine.mjs";
import { onRequestGet, onRequestPost } from "../functions/api/execute.js";
const req = body => ({ request: new Request("https://example.test/api/execute", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) });
test("allowlist rejects invalid and arbitrary inputs", () => {
  assert.equal(validateCommand({ scenario: "invented" }).error, "invalid_scenario");
  assert.equal(validateCommand({ scenario: "qualified", idempotencyKey: "a" }).error, "invalid_idempotency_key");
  assert.equal(validateCommand({ scenario: "qualified", replay: "yes" }).error, "invalid_replay_flag");
  assert.equal(Object.keys(SCENARIOS).length, 4);
});
test("scoring and routing are deterministic", () => {
  assert.equal(qualifyLead(SCENARIOS.qualified).score, 96);
  assert.equal(qualifyLead(SCENARIOS.qualified).lane, "sales");
  assert.equal(qualifyLead(SCENARIOS.review).lane, "review");
  assert.equal(qualifyLead(SCENARIOS.nurture).lane, "nurture");
  assert.equal(crmContract(SCENARIOS.review, qualifyLead(SCENARIOS.review), "abcdefgh").idempotency_key, "abcdefgh");
});
test("live server engine produces trace with explicit sandbox status", async () => {
  const run = await runSyntheticWorkflow({ scenario: "qualified" }, { fast: true, id: () => "test-1" });
  assert.equal(run.runId, "test-1");
  assert.equal(run.execution.model, "not-configured");
  assert.equal(run.execution.outbound, "disabled");
  assert.equal(run.execution.crm, "sandbox-contract-only");
  assert.equal(run.crm.attempts, 1);
  assert.equal(run.events.at(-1).stage, "workflow.completed");
});
test("fault-injected timeout exercises retries without external writes", async () => {
  const run = await runSyntheticWorkflow({ scenario: "timeout" }, { fast: true });
  assert.equal(run.crm.attempts, 3);
  assert.equal(run.events.filter(e => e.stage === "crm.sandbox.timeout").length, 2);
  assert.equal(run.events.filter(e => e.stage === "retry.backoff").length, 2);
});
test("endpoint exposes honest capability metadata", async () => {
  const r = await onRequestGet();
  const b = await r.json();
  assert.equal(b.externalCrm, false);
  assert.equal(b.llm, false);
  assert.equal(r.headers.get("cache-control"), "no-store");
});
test("endpoint validates JSON and returns real trace", async () => {
  const good = await onRequestPost(req({ scenario: "review", idempotencyKey: "testing-key-123" }));
  assert.equal(good.status, 200);
  const body = await good.json();
  assert.equal(body.qualification.lane, "review");
  assert.equal(body.crm.contract.idempotency_key, "testing-key-123");
  const bad = await onRequestPost(req({ scenario: "not-real" }));
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).error, "invalid_scenario");
  const wrongType = await onRequestPost({ request: new Request("https://example.test/api/execute", { method: "POST", headers: { "content-type": "text/plain" }, body: "nope" }) });
  assert.equal(wrongType.status, 415);
  const malformed = await onRequestPost({ request: new Request("https://example.test/api/execute", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }) });
  assert.equal(malformed.status, 400);
});
