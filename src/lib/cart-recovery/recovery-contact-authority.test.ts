import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { resolveRecoveryContactAuthority } from "@/lib/cart-recovery/recovery-contact-authority";

test("guest consent cannot authorize an arbitrary recovery recipient", () => {
  assert.deepEqual(resolveRecoveryContactAuthority({
    requestedConsentStatus: "accepted",
    authUser: null,
  }), {
    canScheduleEmail: false,
    consentStatus: "unknown",
    contactEmail: null,
    authority: "none",
  });
});

test("authenticated recovery contact is bound to the account email", () => {
  assert.deepEqual(resolveRecoveryContactAuthority({
    requestedConsentStatus: "accepted",
    authUser: { id: "user-1", email: " Buyer@Example.COM " },
  }), {
    canScheduleEmail: true,
    consentStatus: "accepted",
    contactEmail: "buyer@example.com",
    authority: "authenticated_account_email",
  });
});

test("declined consent never schedules recovery email", () => {
  assert.equal(resolveRecoveryContactAuthority({
    requestedConsentStatus: "declined",
    authUser: { id: "user-1", email: "buyer@example.com" },
  }).canScheduleEmail, false);
});

test("send-email remains service-only and template-defined", () => {
  const source = readFileSync(
    path.join(process.cwd(), "supabase/functions/send-email/index.ts"),
    "utf8",
  );

  assert.match(source, /if\s*\(!isTrustedServiceRequest\(req\)\)[\s\S]{0,220}status:\s*401/);
  assert.doesNotMatch(source, /auth\.getUser\s*\(/);
  assert.doesNotMatch(source, /store_members/);
  assert.match(source, /const templates:\s*Record<string,/);
  assert.doesNotMatch(source, /interface Payload[\s\S]{0,500}\bsubject\??:/);
  assert.doesNotMatch(source, /interface Payload[\s\S]{0,500}\bhtml\??:/);
});
