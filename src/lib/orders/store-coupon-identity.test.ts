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
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_codes_store_code_unique\s+ON public\.coupon_codes\(store_id, code\)/i,
  );
  assert.match(migration, /DROP CONSTRAINT IF EXISTS coupon_codes_code_key/i);
  assert.match(migration, /WHERE store_id IS NOT NULL/i);
});

test("coupon codes are canonicalized before uniqueness is enforced", () => {
  assert.match(migration, /NEW\.code := upper\(trim\(coalesce\(NEW\.code, ''\)\)\)/i);
  assert.match(migration, /BEFORE INSERT OR UPDATE OF code ON public\.coupon_codes/i);
  assert.match(migration, /duplicate normalized coupon code/i);
});
