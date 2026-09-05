import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("CMS Admin exposes a governed jurisdiction control without browser table authority", () => {
  const route = source("src/app/api/platform/configuration/route.ts");
  const card = source("src/components/admin/PlatformIdentityMessagingSettingsCard.tsx");
  const gateMigration = source("supabase/migrations/20260904030705_merchant_jurisdiction_enforcement_gate_204.sql");

  assert.match(route, /from\("platform_jurisdiction_enforcement_config"\)/);
  assert.match(route, /country_enforcement_enabled/);
  assert.match(route, /countryEnforcementEnabled/);
  assert.match(route, /action === "set_jurisdiction_enforcement"/);
  assert.match(route, /updated_by: guard\.userId/);
  assert.match(route, /platform_jurisdiction_enforcement_updated/);
  assert.match(route, /Legal operator identity is required before jurisdiction enforcement/);

  assert.match(card, /jurisdiction:\s*\{/);
  assert.match(card, /Jurisdiction enforcement/);
  assert.match(card, /mutate\("set_jurisdiction_enforcement", \{ enabled: checked \}\)/);
  assert.doesNotMatch(card, /\.from\("platform_jurisdiction_enforcement_config"\)/);

  assert.match(
    gateMigration,
    /revoke all on public\.platform_jurisdiction_enforcement_config from public, anon, authenticated/i,
  );
});

test("policy activation fails closed on the owner-approved operational sequence", () => {
  const route = source("src/app/api/platform/configuration/route.ts");
  const card = source("src/components/admin/PlatformIdentityMessagingSettingsCard.tsx");
  const activationGuard = source("supabase/migrations/20260904034945_guard_policy_activation_jurisdiction_204.sql");
  const billingGate = source("supabase/migrations/20260904144000_paid_beta_billing_launch_gate_258.sql");

  assert.match(route, /Legal operator identity is required before policy activation/);
  assert.match(route, /Jurisdiction enforcement must be enabled before policy activation/);
  assert.match(route, /Availability monitoring must be started before policy activation/);
  assert.match(route, /jurisdiction enforcement\|availability monitoring/i);
  assert.ok(
    route.indexOf("Jurisdiction enforcement must be enabled before policy activation") <
      route.indexOf('rpc("activate_platform_policy_version"'),
  );
  assert.ok(
    route.indexOf("Availability monitoring must be started before policy activation") <
      route.indexOf('rpc("activate_platform_policy_version"'),
  );

  assert.match(card, /policyActivationBlockedReason/);
  assert.match(card, /!legalOperatorReady/);
  assert.match(card, /!jurisdictionReady/);
  assert.match(card, /!monitoringReady/);
  assert.match(card, /Boolean\(policyActivationBlockedReason\)/);

  assert.match(activationGuard, /jurisdiction enforcement must be enabled before policy activation/i);
  assert.match(billingGate, /j\.country_enforcement_enabled = true/);
  assert.doesNotMatch(billingGate, /monitoring_started_at/);
});

test("jurisdiction rollback remains independent from availability and messaging controls", () => {
  const route = source("src/app/api/platform/configuration/route.ts");
  const card = source("src/components/admin/PlatformIdentityMessagingSettingsCard.tsx");

  assert.match(route, /const enabled = body\.enabled;/);
  assert.match(route, /country_enforcement_enabled: enabled/);
  assert.doesNotMatch(route, /country_enforcement_enabled: enabled[\s\S]*?monitoring_started_at:/);
  assert.match(card, /Start 99% monitoring/);
  assert.match(card, /SMS master/);
  assert.match(card, /Login \/ OTP/);
  assert.match(card, /Platform notifications/);
});
