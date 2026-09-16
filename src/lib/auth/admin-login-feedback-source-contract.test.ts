import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../views/AdminLogin.tsx", import.meta.url), "utf8");

test("admin login exposes persistent accessible auth feedback", () => {
  assert.match(source, /Restoring your dashboard session/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /aria-invalid=/);
  assert.match(source, /aria-describedby=/);
  assert.match(source, /dashboard-email-error/);
  assert.match(source, /dashboard-password-error/);
  assert.match(source, /dashboard-email-form-error/);
  assert.match(source, /google-login-error/);
  assert.match(source, /invite-code-error/);
  assert.match(source, /setup-password-error/);
  assert.match(source, /role="alert"/);
});

test("required auth fields focus the first invalid control without clearing values", () => {
  assert.match(source, /emailRef\.current\?\.focus\(\)/);
  assert.match(source, /passwordRef\.current\?\.focus\(\)/);
  assert.match(source, /inviteRef\.current\?\.focus\(\)/);
  assert.match(source, /setupPasswordRef\.current\?\.focus\(\)/);
  assert.match(source, /value=\{email\}/);
  assert.match(source, /value=\{password\}/);
  assert.match(source, /value=\{inviteCode\}/);
  assert.match(source, /value=\{setupPassword\}/);
  assert.doesNotMatch(source, /phoneRef|otpRef|otpCode/);
});

test("provider failures are normalized before persistent display", () => {
  assert.match(source, /safeEmailAuthError/);
  assert.match(source, /safeGoogleAuthError/);
  assert.match(source, /safeAccessError/);
  assert.doesNotMatch(source, /safePhoneAuthError/);
  assert.doesNotMatch(source, /toast\.error\(error\.message/);
  assert.doesNotMatch(source, /setEmailErrors\(\{ form: error\.message/);
});

test("Google and invite flows retain explicit recovery/status affordances", () => {
  assert.match(source, /Opening Google sign-in/);
  assert.match(source, /Verifying invite code/);
  assert.match(source, /Claiming admin access/);
  assert.doesNotMatch(source, /Send verification code|Verify Phone|Change phone number/);
});
