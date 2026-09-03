import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("same-plan renewals preserve prepaid time and annual cadence", () => {
  const migration = read("supabase/migrations/20260903201618_subscription_renewal_contract_204.sql");
  assert.match(migration, /v_existing_plan_id = new\.plan_id/i);
  assert.match(migration, /v_existing_period_end > v_paid_at/i);
  assert.match(migration, /interval '1 month'/i);
  assert.match(migration, /interval '1 year'/i);
  assert.match(migration, /new\.current_period_ends_at < old\.current_period_ends_at/i);
});

test("renewal contact stays outside tenant-readable subscription and queue rows", () => {
  const privacyMigration = read("supabase/migrations/20260903211647_subscription_renewal_contact_privacy_204.sql");
  assert.match(privacyMigration, /create table public\.store_subscription_renewal_contacts/i);
  assert.match(privacyMigration, /enable row level security/i);
  assert.match(privacyMigration, /from public, anon, authenticated/i);
  assert.match(privacyMigration, /drop column renewal_phone/i);
  assert.match(privacyMigration, /'subscription-expiry-reminder',\s*null,\s*jsonb_build_object/i);

  const edgeFunction = read("supabase/functions/subscription-renewal-reminder/index.ts");
  assert.match(edgeFunction, /from\("store_subscription_renewal_contacts"\)/);
  assert.doesNotMatch(edgeFunction, /payload\.customer_phone/);
  assert.doesNotMatch(edgeFunction, /payload\.to/);
});

test("renewal preference endpoint is owner or platform-billing only", () => {
  const route = read("src/app/api/billing/renewal-preferences/route.ts");
  assert.match(route, /canManageStore\([\s\S]*?\[\],[\s\S]*?\)/);
  assert.match(route, /row\.role === "billing_admin"/);
  assert.match(route, /set_store_subscription_renewal_preferences/);
});

test("only expiry reminders are routed to the dedicated service", () => {
  const queue = read("src/lib/notifications/notification-delivery-queue.ts");
  assert.match(queue, /payload\.templateName === "subscription-expiry-reminder"/);
  assert.match(queue, /\? "subscription-renewal-reminder"\s*:\s*"send-email"/);
});

test("manual bKash review leaves production entitlement settlement to Postgres", () => {
  const route = read("src/app/api/platform/billing/manual-review/route.ts");
  assert.match(route, /sync_paid_invoice_entitlements_trigger/);
  assert.match(route, /typeof \(supabaseAdmin as \{ rpc\?: unknown \}\)\.rpc !== "function"/);
  assert.match(route, /production entitlement writes remain transactionally owned by Postgres/);
});

