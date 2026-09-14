import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("retry-required recovery runs before best-effort order-created effects", () => {
  const source = read("src/lib/orders/order-background-jobs.ts");
  const recoveryCall = source.indexOf("await markRecoveryLeadRecovered");
  const bestEffortBlock = source.indexOf("const taskNames = [\"merchant-notification\", \"analytics\"]");

  assert.ok(recoveryCall >= 0, "retry-required recovery call must exist");
  assert.ok(bestEffortBlock > recoveryCall, "recovery must run before best-effort effects");
  assert.match(source, /cart-recovery-retry-required/);
  assert.match(source, /throw error;/);
  assert.match(source, /errorCode\(result\?\.error\) === "23505"/);
  assert.match(source, /order-created-merchant-notify-claim/);
});

test("inline retry-required recovery is handed to the durable queue", () => {
  const source = read("src/lib/orders/order-background-queue.ts");

  assert.match(source, /inline-retry-required/);
  assert.match(source, /await enqueueOrderBackgroundMessage\(message, idempotencyKey\)/);
  assert.match(source, /mode: "queue-recovery"/);
  assert.match(source, /orders\.queue\.consumer\.\$\{message\.type\}/);
  assert.match(source, /throw error;/);
});

test("order-background sink identities are database-enforced", () => {
  const migration = read("supabase/migrations/20260914231000_order_background_effect_idempotency.sql");

  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_store_analytics_order_created_once/i);
  assert.match(migration, /event_name = 'order_created'/i);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_store_analytics_order_created_item_once/i);
  assert.match(migration, /event_name = 'order_created_item'/i);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_email_events_order_created_merchant_notify_claim_once/i);
  assert.match(migration, /order-created-merchant-notify-claim/i);
  assert.match(migration, /order_background_reconciliation_required/i);
});

test("cancellation background runner no longer fabricates financial side effects", () => {
  const source = read("src/lib/orders/order-background-jobs.ts");
  const start = source.indexOf("export async function runOrderCancelledBackgroundJobs");
  assert.ok(start >= 0);
  const block = source.slice(start);

  assert.doesNotMatch(block, /store_revenue_events/);
  assert.match(block, /return Promise\.allSettled\(\[\]\)/);
});
