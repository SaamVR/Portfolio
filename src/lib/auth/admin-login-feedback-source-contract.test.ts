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
  assert.match(source, /dashboard-phone-error/);
  assert.match(source, /dashboard-phone-code-error/);
  assert.match(source, /invite-code-error/);
  assert.match(source, /setup-password-error/);
  assert.match(source, /role="alert"/);
});

test("required auth fields focus the first invalid control without clearing values", () => {
  assert.match(source, /emailRef\.current\?\.focus\(\)/);
  assert.match(source, /passwordRef\.current\?\.focus\(\)/);
  assert.match(source, /phoneRef\.current\?\.focus\(\)/);
  assert.match(source, /otpRef\.current\?\.focus\(\)/);
  assert.match(source, /inviteRef\.current\?\.focus\(\)/);
  assert.match(source, /setupPasswordRef\.current\?\.focus\(\)/);
  assert.match(source, /value=\{email\}/);
  assert.match(source, /value=\{password\}/);
  assert.match(source, /value=\{phone\}/);
  assert.match(source, /value=\{otpCode\}/);
  assert.match(source, /value=\{inviteCode\}/);
  assert.match(source, /value=\{setupPassword\}/);
});

test("provider failures are normalized before persistent display", () => {
  assert.match(source, /safeEmailAuthError/);
  assert.match(source, /safePhoneAuthError/);
  assert.match(source, /safeGoogleAuthError/);
  assert.match(source, /safeAccessError/);
  assert.doesNotMatch(source, /toast\.error\(error\.message/);
  assert.doesNotMatch(source, /setEmailErrors\(\{ form: error\.message/);
  assert.doesNotMatch(source, /setPhoneErrors\(\{ form: error\.message/);
});

test("phone and invite flows retain explicit recovery/status affordances", () => {
  assert.match(source, /Verification code sent\. Enter it below to continue\./);
  assert.match(source, /Change phone number/);
  assert.match(source, /Send verification code/);
  assert.match(source, /Verifying invite code/);
  assert.match(source, /Claiming admin access/);
});
