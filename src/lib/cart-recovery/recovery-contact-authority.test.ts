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

test("cart recovery route never treats browser contact fields as delivery authority", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/app/api/cart-recovery/lead/route.ts"),
    "utf8",
  );

  assert.match(source, /resolveRecoveryContactAuthority\([\s\S]{0,160}authUser/);
  assert.match(source, /contactEmail\s*=\s*contactAuthority\.contactEmail/);
  assert.doesNotMatch(source, /readText\(contact\.email/);
  assert.match(source, /contactPhone\s*=\s*null/);
  assert.match(source, /cart_recovery_contact:\$\{storeId\}:\$\{authUser\.id\}/);
  assert.match(source, /limit:\s*6[\s\S]{0,80}windowMs:\s*60\s*\*\s*60_000/);
  assert.match(source, /next_contact_at:\s*nextContactAt/);
  assert.match(source, /recovery_contact_authority:\s*contactAuthority\.authority/);
});
