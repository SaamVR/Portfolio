import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const edgeSource = readFileSync(
  new URL("../../../supabase/functions/claim-invite-code/index.ts", import.meta.url),
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
  assert.match(migrationSource, /REVOKE ALL ON FUNCTION public\.claim_invite_code_atomic\(text, uuid, text\) FROM authenticated/);
  assert.match(migrationSource, /GRANT EXECUTE ON FUNCTION public\.claim_invite_code_atomic\(text, uuid, text\) TO service_role/);
});
