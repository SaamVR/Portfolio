import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

test("storefront routine ACL reconciliation preserves only intended public entry points", () => {
  const migration = source("../../../supabase/migrations/20260904175700_reconcile_storefront_routine_acl_261_262.sql");

  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.can_manage_store\(uuid, uuid\) TO anon, authenticated;/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.has_role\(uuid, public\.app_role\) TO anon, authenticated;/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.validate_coupon\(text, integer, uuid\) TO anon, authenticated;/,
  );
  assert.match(
    migration,
    /REVOKE EXECUTE ON FUNCTION public\.validate_coupon\(text, integer\) FROM PUBLIC, anon, authenticated;/,
  );
  assert.doesNotMatch(
    migration,
    /REVOKE EXECUTE ON FUNCTION public\.validate_coupon\(text, integer, uuid\)/,
  );
});

test("checkout coupon validation always carries immutable store scope", () => {
  const checkout = source("../../views/Checkout.tsx");
  const calls = checkout.match(/supabase\.rpc\("validate_coupon" as any,\s*\{[\s\S]*?\n\s*\}\);/g) ?? [];

  assert.equal(calls.length, 2, "Expected exactly two validate_coupon calls in checkout");
  for (const call of calls) {
    assert.match(call, /_store_id: checkoutStoreId,/);
  }
});

test("canonical scoped coupon helper filters by the supplied store id", () => {
  const functions = source("../../../supabase/migrations/05_functions_and_policies.sql");

  assert.match(
    functions,
    /CREATE OR REPLACE FUNCTION public\.validate_coupon\([\s\S]*?_store_id uuid[\s\S]*?WHERE code = upper\(trim\(_code\)\)[\s\S]*?AND store_id = _store_id/,
  );
});
