import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260914211000_scope_coupon_codes_per_store.sql"),
  "utf8",
);

test("coupon identity is store-scoped instead of globally unique", () => {
  assert.match(
    migration,
    /CREATE UNIQUE INDEX idx_coupon_codes_store_code_unique\s+ON public\.coupon_codes\(store_id, code\)/i,
  );
  assert.match(migration, /DROP CONSTRAINT IF EXISTS coupon_codes_code_key/i);
  assert.match(migration, /ALTER COLUMN store_id SET NOT NULL/i);
  assert.match(migration, /DROP INDEX IF EXISTS public\.idx_coupon_codes_global_code_unique/i);
  assert.equal(
    /CREATE\s+UNIQUE\s+INDEX[\s\S]*?ON\s+public\.coupon_codes\s*\(code\)[\s\S]*?WHERE\s+store_id\s+IS\s+NULL/i.test(migration),
    false,
  );
});

test("coupon codes are canonicalized after the obsolete global constraint is removed", () => {
  const dropGlobal = migration.indexOf("DROP CONSTRAINT IF EXISTS coupon_codes_code_key");
  const normalizeExisting = migration.indexOf("SET code = upper(trim(code))");
  assert.ok(dropGlobal >= 0);
  assert.ok(normalizeExisting > dropGlobal);
  assert.match(migration, /NEW\.code := upper\(trim\(coalesce\(NEW\.code, ''\)\)\)/i);
  assert.match(migration, /BEFORE INSERT OR UPDATE OF code, store_id ON public\.coupon_codes/i);
  assert.match(migration, /duplicate normalized coupon code/i);
  assert.match(migration, /coupon store is required/i);
});


test("storefront shoppers cannot enumerate active coupon rows", () => {
  const privacyMigration = readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260914225000_hide_store_coupon_codes.sql"),
    "utf8",
  );

  assert.match(privacyMigration, /CREATE POLICY "Store managers can view store coupons"/);
  assert.match(privacyMigration, /TO authenticated[\s\S]*can_manage_store\(store_id/);
  assert.match(privacyMigration, /REVOKE SELECT ON TABLE public\.coupon_codes FROM anon/);
  assert.match(privacyMigration, /GRANT EXECUTE ON FUNCTION public\.validate_coupon\(text, integer, uuid\)[\s\S]*TO anon, authenticated/);
  assert.doesNotMatch(privacyMigration, /CREATE POLICY "Public and store managers can view active store coupons"/);
});
