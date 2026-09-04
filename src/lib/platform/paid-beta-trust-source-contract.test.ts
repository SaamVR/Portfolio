import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("paid-beta trust migration keeps both controls dormant until explicit activation", () => {
  const migration = source("supabase/migrations/20260904044554_paid_beta_trust_controls_204.sql");

  assert.match(migration, /platform_policy_config/);
  assert.match(migration, /binding boolean NOT NULL DEFAULT false/);
  assert.match(migration, /platform_policy_acceptances/);
  assert.match(migration, /enforce_store_platform_policy_acceptance/);
  assert.match(migration, /enforce_invoice_platform_policy_acceptance/);
  assert.match(migration, /monitoring_started_at timestamptz/);
  assert.match(migration, /VALUES \(true, null, 99\.00\)/);
  assert.match(migration, /platform-availability-probe/);
  assert.match(migration, /missing_slots := GREATEST\(v_expected - v_success, 0\)/);
  const activationGrant = source("supabase/migrations/20260904064655_grant_availability_activation_service_role_204.sql");
  assert.match(activationGrant, /grant execute on function public\.activate_platform_availability_monitoring\(\) to service_role, postgres/i);
  assert.match(activationGrant, /revoke all on function public\.activate_platform_availability_monitoring\(\) from public, anon, authenticated/i);
});

test("policy consent is server-owned and gates authenticated merchant signup", () => {
  const route = source("src/app/api/platform/policy-consent/route.ts");
  const gate = source("src/components/platform/PolicyConsentGate.tsx");
  const signup = source("src/views/MerchantSignupEntry.tsx");
  const billing = source("src/app/admin/(admin-dashboard)/billing/page.tsx");

  assert.match(route, /PAID_BETA_POLICY_VERSION/);
  assert.match(route, /platform_policy_config/);
  assert.match(route, /acceptance_text: config\.acceptance_text/);
  assert.doesNotMatch(route, /acceptance_text:\s*body/);
  assert.match(route, /platform_policy_acceptances/);
  assert.match(gate, /\/terms/);
  assert.match(gate, /\/privacy/);
  assert.match(gate, /\/billing-policy/);
  assert.match(signup, /PolicyConsentGate context="merchant_signup"/);
  assert.match(billing, /PolicyConsentGate context="billing"/);
});

test("availability probe reuses machine auth and records only through the protected RPC", () => {
  const route = source("src/app/api/platform/availability-probe/route.ts");
  const ledger = source("supabase/production-migration-ledger.json");

  assert.match(route, /NOTIFICATION_PROCESSOR_SECRET/);
  assert.match(route, /x-notification-queue-secret/);
  assert.match(route, /record_platform_availability_success/);
  assert.match(route, /status: 503/);
  assert.match(ledger, /paid_beta_trust_controls_204/);
});
