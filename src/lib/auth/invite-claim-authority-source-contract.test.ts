import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const edgeSource = readFileSync(
  new URL("../../../supabase/functions/claim-invite-code/index.ts", import.meta.url),
  "utf8",
);
const inviteUiSource = readFileSync(
  new URL("../../../src/views/admin/InviteCodes.tsx", import.meta.url),
  "utf8",
);
const migrationSource = readFileSync(
  new URL("../../../supabase/migrations/20260914200500_atomic_invite_claim_authority_323.sql", import.meta.url),
  "utf8",
);

test("invite edge function delegates authority mutation to one atomic RPC", () => {
  assert.match(edgeSource, /\.rpc\("claim_invite_code_atomic"/);
  assert.doesNotMatch(edgeSource, /\.from\("store_memberships"\)\s*\.insert/);
  assert.doesNotMatch(edgeSource, /\.from\("user_roles"\)\s*\.upsert/);
  assert.doesNotMatch(edgeSource, /\.from\("store_staff_invites"\)\s*\.update/);
  assert.doesNotMatch(edgeSource, /\.from\("invite_codes"\)\s*\.update/);
});

test("atomic invite RPC enforces lock, exactly-once consumption, binding, and service-role ACL", () => {
  assert.match(migrationSource, /FOR UPDATE/);
  assert.match(migrationSource, /claimed_by IS NULL/);
  assert.match(migrationSource, /used_by IS NULL/);
  assert.match(migrationSource, /pg_advisory_xact_lock/);
  assert.match(migrationSource, /identity_binding_required/);
  assert.match(migrationSource, /invite_codes_unused_requires_email/);
  assert.match(migrationSource, /owner_staff_invite_reconciliation_required/);
  assert.match(migrationSource, /store_staff_invites_pending_role_not_owner/);
  assert.match(migrationSource, /owner_role_not_invitable/);
  assert.match(migrationSource, /resolve_store_staff_seat_limit/);
  assert.match(migrationSource, /enforce_store_membership_authority_trigger/);
  assert.match(migrationSource, /store_staff_seat_limit_reached/);
  assert.match(migrationSource, /staff_seat_limit_reached/);
  assert.match(migrationSource, /staff-seat:/);
  assert.match(migrationSource, /store_owner_membership_identity_required/);
  assert.match(migrationSource, /REVOKE ALL ON FUNCTION public\.claim_invite_code_atomic\(text, uuid, text\) FROM authenticated/);
  assert.match(migrationSource, /GRANT EXECUTE ON FUNCTION public\.claim_invite_code_atomic\(text, uuid, text\) TO service_role/);
});


test("team-access UI uses non-owner staff seats and disables creation at capacity", () => {
  assert.match(inviteUiSource, /member\.role !== "owner"/);
  assert.match(inviteUiSource, /seatLimitReached/);
  assert.match(inviteUiSource, /disabled=\{creating \|\| seatLimitReached\}/);
});
