import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const migration = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260914215000_enforce_commerce_numeric_bounds.sql"),
  "utf8",
);

test("product price and stock cannot persist below zero", () => {
  assert.match(migration, /products_price_nonnegative CHECK \(price >= 0\)/i);
  assert.match(migration, /products_original_price_nonnegative CHECK \(original_price IS NULL OR original_price >= 0\)/i);
  assert.match(migration, /products_stock_nonnegative CHECK \(stock >= 0\)/i);
});

test("coupon bounds match merchant coupon controls", () => {
  assert.match(migration, /discount_type <> 'percentage' OR discount_value <= 100/i);
  assert.match(migration, /coupon_codes_min_order_nonnegative CHECK \(min_order >= 0\)/i);
  assert.match(migration, /coupon_codes_max_uses_positive CHECK \(max_uses IS NULL OR max_uses >= 1\)/i);
  assert.match(migration, /coupon_codes_uses_count_nonnegative CHECK \(uses_count >= 0\)/i);
});
