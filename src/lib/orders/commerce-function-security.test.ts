import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260914225500_pin_commerce_function_search_paths.sql"),
  "utf8",
);

test("commerce functions pin search_path without changing their public contracts", () => {
  assert.match(
    migration,
    /ALTER FUNCTION public\.search_storefront_products\([\s\S]*uuid,[\s\S]*text,[\s\S]*text,[\s\S]*text,[\s\S]*numeric,[\s\S]*numeric,[\s\S]*boolean,[\s\S]*integer[\s\S]*\)[\s\S]*SET search_path = pg_catalog, public/i,
  );
  assert.match(
    migration,
    /ALTER FUNCTION public\.protect_subscription_renewal_period\(\)[\s\S]*SET search_path = pg_catalog, public/i,
  );
  assert.doesNotMatch(migration, /DROP FUNCTION/i);
  assert.doesNotMatch(migration, /REVOKE\s+EXECUTE/i);
});
