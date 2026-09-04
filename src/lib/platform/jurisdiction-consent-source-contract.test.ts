import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("merchant legal profile uses selected country while Vercel geolocation stays a hint", () => {
  const migration = source("supabase/migrations/20260904022705_merchant_jurisdiction_consent_204.sql");
  const route = source("src/app/api/platform/policy-consent/route.ts");

  assert.match(migration, /merchant_legal_profiles/);
  assert.match(migration, /business_country_code/);
  assert.match(migration, /geo_hint_country_code/);
  assert.match(migration, /platform_country_jurisdictions/);
  assert.match(route, /x-vercel-ip-country/);
  assert.match(route, /x-vercel-ip-country-region/);
  assert.match(route, /p_business_country_code: countryCode/);
  assert.doesNotMatch(route, /fetch\([^)]*(geo|ipinfo|geolocation)/i);
});

test("policy acceptance is immutable per version, country, and legal regime", () => {
  const migration = source("supabase/migrations/20260904022705_merchant_jurisdiction_consent_204.sql");
  const route = source("src/app/api/platform/policy-consent/route.ts");

  assert.match(migration, /platform_policy_acceptances_user_version_jurisdiction_uidx/);
  assert.match(migration, /a\.business_country_code = v_country/);
  assert.match(migration, /a\.legal_regime = v_regime/);
  assert.match(route, /business_country_code: countryCode/);
  assert.match(route, /legal_regime: regime/);
});

test("signup and billing both use the blocking policy gate", () => {
  const signup = source("src/views/MerchantSignupEntry.tsx");
  const billing = source("src/app/admin/(admin-dashboard)/billing/page.tsx");

  assert.match(signup, /<PolicyConsentGate context="merchant_signup">/);
  assert.match(billing, /<PolicyConsentGate context="billing">/);
  assert.match(billing, /<PageComponent \/>/);
  assert.doesNotMatch(billing, /<PolicyConsentGate context="billing" \/>/);
});

test("database stays authoritative for store creation and paid invoices", () => {
  const bootstrapMigration = source("supabase/migrations/20260904022704_bootstrap_platform_policy_acceptances_204.sql");
  const trustMigration = source("supabase/migrations/20260904044554_paid_beta_trust_controls_204.sql");
  const jurisdictionMigration = source("supabase/migrations/20260904022705_merchant_jurisdiction_consent_204.sql");
  const authorityMigration = source("supabase/migrations/20260904023449_merchant_country_authority_204.sql");

  assert.match(bootstrapMigration, /create table if not exists public\.platform_policy_acceptances/);
  assert.match(bootstrapMigration, /enable row level security/);
  assert.match(trustMigration, /enforce_store_platform_policy_acceptance/);
  assert.match(trustMigration, /enforce_invoice_platform_policy_acceptance/);
  assert.match(jurisdictionMigration, /merchant_country_required/);
  assert.match(jurisdictionMigration, /platform_policy_acceptance_required/);
  assert.ok(authorityMigration.indexOf("merchant_country_required") < authorityMigration.indexOf("select policy_version, binding, effective_at"));
});

test("paid checkout consent authority stays aligned to the store owner", () => {
  const checkout = source("src/app/api/billing/checkout/route.ts");

  assert.match(checkout, /canManageStore\(supabaseAdmin, storeId, user\.id, \[\s*"owner",?\s*\]\)/s);
  assert.doesNotMatch(checkout, /\[\s*"owner",\s*"admin",?\s*\]/s);
  assert.match(checkout, /error: "Forbidden"/);
});

test("country authority is rollout-gated until the matching app release is live", () => {
  const gateMigration = source("supabase/migrations/20260904030705_merchant_jurisdiction_enforcement_gate_204.sql");
  const activationGuard = source("supabase/migrations/20260904034945_guard_policy_activation_jurisdiction_204.sql");
  const route = source("src/app/api/platform/policy-consent/route.ts");

  assert.match(gateMigration, /country_enforcement_enabled boolean not null default false/);
  assert.match(gateMigration, /if coalesce\(v_enforcement_enabled, false\) = false then\s+return;/s);
  assert.ok(gateMigration.indexOf("v_enforcement_enabled") < gateMigration.indexOf("merchant_country_required"));
  assert.match(gateMigration, /revoke all on public\.platform_jurisdiction_enforcement_config from public, anon, authenticated/i);
  assert.match(activationGuard, /jurisdiction enforcement must be enabled before policy activation/);
  assert.ok(activationGuard.indexOf("v_jurisdiction_enforcement") < activationGuard.indexOf("insert into public.platform_policy_versions"));
  assert.match(route, /loadEnforcementConfig/);
  assert.match(route, /required: enforcementEnabled &&/);
  assert.match(route, /bindingActive && !enforcementEnabled/);
});

test("post-trust reconciliation preserves jurisdiction authority after historical migration ordering", () => {
  const reconciliation = source("supabase/migrations/20260904055347_reconcile_jurisdiction_consent_order_204.sql");

  assert.match(reconciliation, /country_enforcement_enabled boolean NOT NULL DEFAULT false/i);
  assert.match(reconciliation, /CREATE OR REPLACE FUNCTION public\.assert_current_platform_policy_accepted/i);
  assert.ok(reconciliation.indexOf("v_enforcement_enabled") < reconciliation.indexOf("merchant_country_required"));
  assert.match(reconciliation, /a\.business_country_code = v_country/);
  assert.match(reconciliation, /a\.legal_regime = v_regime/);
  assert.match(reconciliation, /jurisdiction enforcement must be enabled before policy activation/);
});
