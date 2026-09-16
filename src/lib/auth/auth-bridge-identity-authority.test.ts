import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("application auth bridge is retired and fail-closed", () => {
  const route = read("src/app/api/auth-bridge/route.ts");

  assert.match(route, /status:\s*410/);
  assert.match(route, /auth_bridge_retired/);
  assert.doesNotMatch(route, /identitytoolkit\.googleapis\.com/);
  assert.doesNotMatch(route, /external_auth_identities/);
  assert.doesNotMatch(route, /generateLink|verifyOtp|signInWithPassword|setSession/);
});

test("legacy public auth-bridge Edge function remains a 410 tombstone", () => {
  const edge = read("supabase/functions/auth-bridge/index.ts");

  assert.match(edge, /status:\s*410/);
  assert.match(edge, /auth_bridge_retired/);
  assert.doesNotMatch(edge, /createClient/);
  assert.doesNotMatch(edge, /accounts:lookup/);
  assert.doesNotMatch(edge, /updateUserById/);
  assert.doesNotMatch(edge, /signInWithPassword/);
});

test("merchant and customer auth UIs contain no Firebase phone-auth path", () => {
  const adminLogin = read("src/views/AdminLogin.tsx");
  const customerAuth = read("src/views/Auth.tsx");
  const merchantSignup = read("src/views/MerchantSignupV3.tsx");
  const combined = `${adminLogin}\n${customerAuth}\n${merchantSignup}`;

  assert.doesNotMatch(combined, /firebase-phone-auth|auth-bridge-client/);
  assert.doesNotMatch(combined, /sendPhoneVerificationCode|exchangeFirebaseTokenForSupabaseSession/);
  assert.doesNotMatch(combined, /phone-recaptcha-container|Verification Code|Continue with Phone|Create with Phone|Verify Phone/);
  assert.match(adminLogin, /signInWithPassword/);
  assert.match(adminLogin, /signInWithGoogle/);
  assert.match(customerAuth, /signInWithPassword/);
  assert.match(customerAuth, /signInWithGoogle/);
  assert.match(merchantSignup, /signInWithGoogle/);
});

test("Firebase client dependency and runtime bridge helpers are removed", () => {
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(packageJson.dependencies?.firebase, undefined);
  assert.equal(existsSync(path.join(process.cwd(), "src/lib/firebase-phone-auth.ts")), false);
  assert.equal(existsSync(path.join(process.cwd(), "src/lib/auth-bridge-client.ts")), false);
});

test("historical binding migration is preserved but superseded by a forward-only cleanup", () => {
  const historical = read("supabase/migrations/20260914232000_external_auth_identity_binding_334.sql");
  const retirement = read("supabase/migrations/20260917010000_retire_firebase_phone_auth.sql");
  const policy = JSON.parse(read("supabase/migration-drift-policy.json"));
  const historicalPolicy = policy.exceptions.find((entry: { name?: string }) => entry.name === "external_auth_identity_binding_334");
  const retirementPolicy = policy.exceptions.find((entry: { name?: string }) => entry.name === "retire_firebase_phone_auth");

  assert.match(historical, /CREATE TABLE IF NOT EXISTS public\.external_auth_identities/i);
  assert.match(retirement, /DROP TABLE IF EXISTS public\.external_auth_identities/i);
  assert.match(retirement, /DROP FUNCTION IF EXISTS public\.get_user_id_by_email\(text\)/i);
  assert.equal(historicalPolicy?.classification, "non-production");
  assert.equal(retirementPolicy?.classification, "pending-production");
});
