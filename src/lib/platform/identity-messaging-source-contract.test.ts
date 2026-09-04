import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("platform identity and SMS credentials stay CMS-admin scoped and secret managed", () => {
  const migration = source("supabase/migrations/20260903232301_platform_identity_messaging_config_204.sql");
  const route = source("src/app/api/platform/configuration/route.ts");
  const guard = source("src/lib/platform/configuration-admin.ts");

  assert.match(migration, /platform_identity_config/);
  assert.match(migration, /platform_sms_provider_connections/);
  assert.match(migration, /vault\.create_secret/);
  assert.match(migration, /vault\.update_secret/);
  assert.match(migration, /revoke all on public\.platform_identity_config from public, anon, authenticated/i);
  assert.match(migration, /revoke all on public\.platform_sms_provider_connections from public, anon, authenticated/i);
  assert.match(route, /safeProviderConnection/);
  assert.doesNotMatch(route, /decrypted_secret/);
  assert.doesNotMatch(route, /vault_secret_id.*NextResponse/);
  assert.match(guard, /"admin"/);
  assert.match(guard, /"super_admin"/);
  assert.doesNotMatch(guard, /"co_admin"/);
  assert.doesNotMatch(guard, /billing_admin/);
  assert.doesNotMatch(guard, /support_agent/);
});

test("GreenWeb is a replaceable adapter and verifies credentials without sending an SMS", () => {
  const greenweb = source("src/lib/messaging/providers/greenweb.ts");
  const registry = source("src/lib/messaging/providers/registry.ts");

  assert.match(greenweb, /g_api\.php/);
  assert.match(greenweb, /balance/);
  assert.match(greenweb, /api\.php/);
  const verificationBlock = greenweb.split("async verifyCredential", 2)[1]?.split("async send", 1)[0] ?? "";
  assert.match(verificationBlock, /g_api|GREENWEB_ACCOUNT_URL|balance/);
  assert.doesNotMatch(verificationBlock, /message:/);
  assert.doesNotMatch(verificationBlock, /to:/);
  assert.match(registry, /greenweb/);
  assert.match(registry, /getSmsProviderAdapter/);
});

test("messaging master switch normalizes purpose flags off server-side", () => {
  const route = source("src/app/api/platform/configuration/route.ts");
  assert.match(route, /const otpEnabled = smsEnabled && body\?\.otpEnabled === true/);
  assert.match(route, /const transactionalEnabled = smsEnabled && body\?\.transactionalEnabled === true/);
});

test("Supabase Auth SMS hook keeps Supabase authoritative and uses the shared provider runtime", () => {
  const hook = source("supabase/functions/send-auth-sms/index.ts");
  const shared = source("supabase/functions/_shared/platform-sms.ts");
  const reminder = source("supabase/functions/subscription-renewal-reminder/index.ts");

  assert.match(hook, /standardwebhooks/);
  assert.match(hook, /sms\.otp/);
  assert.match(hook, /loadPlatformSmsRuntime/);
  assert.match(hook, /sendPlatformSms/);
  assert.match(shared, /get_platform_sms_provider_secret/);
  assert.match(shared, /otp_enabled/);
  assert.match(shared, /transactional_enabled/);
  assert.doesNotMatch(reminder, /PLATFORM_GREENWEB_API_KEY/);
  assert.doesNotMatch(reminder, /Your EZComo subscription|Open EZComo billing/);
  assert.match(reminder, /loadPlatformSiteName/);
  assert.match(reminder, /loadPlatformSmsRuntime/);
});

test("legal activation snapshots mutable CMS identity before binding", () => {
  const migration = source("supabase/migrations/20260903232301_platform_identity_messaging_config_204.sql");
  const runtime = source("src/lib/platform/public-policy-runtime.ts");

  assert.match(migration, /site_name_snapshot/);
  assert.match(migration, /legal_operator_name_snapshot/);
  assert.match(migration, /legal operator name must be configured before policy activation/);
  assert.match(migration, /policy version already exists with a different immutable snapshot/);
  assert.match(runtime, /site_name_snapshot/);
  assert.match(runtime, /legal_operator_name_snapshot/);
});

test("binding policy source preserves owner-approved material terms", () => {
  const policy = source("src/lib/platform/paid-beta-policy-copy.tsx");
  assert.match(policy, /99% monthly Core Service availability level/);
  assert.match(policy, /These Terms do not require mandatory private arbitration/);
  assert.match(policy, /does not apply one universal retention period/);
  assert.match(policy, /7 calendar days after the successful charge/);
  assert.match(policy, /renewal preference by itself does not authorize/);
  assert.match(policy, /one calendar month/);
  assert.match(policy, /12 calendar months/);
  assert.match(policy, /does not guarantee successful delivery of every message/);
  assert.doesNotMatch(policy, /artificial monetary liability cap[^<]*\d/);
});

test("active platform surfaces use runtime CMS identity instead of a fixed platform brand", () => {
  const layout = source("src/app/layout.tsx");
  const homepage = source("src/components/marketing/CommercialTruthLandingPage.tsx");
  const plans = source("src/app/plans/page.tsx");
  const support = source("src/app/support/page.tsx");
  const trustLinks = source("src/components/platform/PublicTrustLinks.tsx");
  const signupEntry = source("src/views/MerchantSignupEntry.tsx");

  assert.match(layout, /getPlatformRuntimeIdentity/);
  assert.match(homepage, /usePlatformIdentity/);
  assert.doesNotMatch(homepage, /PLATFORM_BRAND_NAME/);
  assert.match(plans, /getPlatformRuntimeIdentity/);
  assert.doesNotMatch(plans, /PLATFORM_BRAND_NAME/);
  assert.match(support, /getPlatformRuntimeIdentity/);
  assert.doesNotMatch(support, /PLATFORM_BRAND_NAME/);
  assert.match(trustLinks, /getPlatformRuntimeIdentity/);
  assert.doesNotMatch(trustLinks, /PLATFORM_BRAND_NAME/);
  assert.match(signupEntry, /usePlatformIdentity/);
});
