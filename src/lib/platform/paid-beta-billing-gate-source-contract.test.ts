import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("paid beta billing readiness is tied to the approved trust state", () => {
  const migration = source("../../../supabase/migrations/20260904144000_paid_beta_billing_launch_gate_258.sql");

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.is_paid_beta_billing_ready\(\)/);
  assert.match(migration, /p\.policy_version = '2026-09-04-paid-beta-1'/);
  assert.match(migration, /p\.binding = true/);
  assert.match(migration, /now\(\) >= p\.effective_at/);
  assert.match(migration, /site_name_snapshot/);
  assert.match(migration, /legal_operator_name_snapshot/);
  assert.match(migration, /j\.country_enforcement_enabled = true/);
  assert.match(migration, /paid_beta_billing_unavailable/);
});

test("positive invoice creation and settlement cannot cross the launch boundary", () => {
  const migration = source("../../../supabase/migrations/20260904144000_paid_beta_billing_launch_gate_258.sql");

  assert.match(
    migration,
    /IF NEW\.status = 'pending' THEN\s+PERFORM public\.assert_paid_beta_billing_ready\(\);/s,
  );
  assert.match(
    migration,
    /BEFORE UPDATE OF status ON public\.store_invoices[\s\S]*WHEN \(NEW\.status = 'paid' AND OLD\.status IS DISTINCT FROM NEW\.status\)/,
  );
  assert.match(migration, /PERFORM public\.assert_current_platform_policy_accepted\(v_owner_id\);/);
  assert.match(migration, /IF NEW\.amount <= 0 THEN\s+RETURN NEW;/s);
});

test("billing UI is held behind the same paid beta trust prerequisites", () => {
  const route = source("../../app/api/platform/policy-consent/route.ts");
  const billingPage = source("../../app/admin/(admin-dashboard)/billing/page.tsx");

  assert.match(route, /site_name_snapshot, legal_operator_name_snapshot/);
  assert.match(route, /config\.policy_version === PAID_BETA_POLICY_VERSION/);
  assert.match(route, /Boolean\(config\.site_name_snapshot\?\.trim\(\)\)/);
  assert.match(route, /Boolean\(config\.legal_operator_name_snapshot\?\.trim\(\)\)/);
  assert.match(route, /context === "billing" && !paidBillingReady/);
  assert.match(route, /Paid billing is not open yet/);
  assert.match(route, /paidBillingReady,/);
  assert.match(billingPage, /<PolicyConsentGate context="billing">/);
});
