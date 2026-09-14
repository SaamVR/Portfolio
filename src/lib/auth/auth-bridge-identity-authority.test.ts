import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("Firebase bridge resolves existing users only through durable external subject binding", () => {
  const route = read("src/app/api/auth-bridge/route.ts");

  assert.match(route, /from\(["']external_auth_identities["']\)/);
  assert.match(route, /provider_project_id/);
  assert.match(route, /provider_subject/);
  assert.match(route, /emailVerified === true/);
  assert.match(route, /identity_link_required/);

  assert.doesNotMatch(route, /admin\.listUsers\s*\(/);
  assert.doesNotMatch(route, /users\.find\s*\([^)]*email/);
  assert.doesNotMatch(route, /users\.find\s*\([^)]*phone/);
});

test("Firebase bridge issues a one-time Supabase session without resetting passwords", () => {
  const route = read("src/app/api/auth-bridge/route.ts");

  assert.match(route, /auth\.admin\.generateLink\s*\(/);
  assert.match(route, /type:\s*["']magiclink["']/);
  assert.match(route, /auth\.verifyOtp\s*\(/);
  assert.match(route, /token_hash:\s*tokenHash/);
  assert.match(route, /authData\.user\.id !== supabaseUser\.id/);

  assert.doesNotMatch(route, /updateUserById\s*\([^)]*password/);
  assert.doesNotMatch(route, /signInWithPassword\s*\(/);
  assert.doesNotMatch(route, /tempPassword/);
});

test("external identity binding is server-only and unique by immutable Firebase subject", () => {
  const migration = read("supabase/migrations/20260914232000_external_auth_identity_binding_334.sql");

  assert.match(migration, /UNIQUE \(provider, provider_project_id, provider_subject\)/i);
  assert.match(migration, /UNIQUE \(provider, provider_project_id, supabase_user_id\)/i);
  assert.match(migration, /REFERENCES auth\.users\(id\) ON DELETE CASCADE/i);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON TABLE public\.external_auth_identities FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.external_auth_identities TO service_role/i);
  assert.match(migration, /external_auth_identity_reconciliation_required/i);
});

test("legacy public auth-bridge Edge function is fail-closed", () => {
  const edge = read("supabase/functions/auth-bridge/index.ts");

  assert.match(edge, /status:\s*410/);
  assert.match(edge, /auth_bridge_retired/);
  assert.doesNotMatch(edge, /createClient/);
  assert.doesNotMatch(edge, /accounts:lookup/);
  assert.doesNotMatch(edge, /updateUserById/);
  assert.doesNotMatch(edge, /signInWithPassword/);
});
