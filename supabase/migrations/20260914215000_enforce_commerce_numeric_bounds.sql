-- Persist the same numeric bounds enforced by merchant/storefront contracts.
-- These checks protect direct authenticated catalog/coupon writes from storing
-- values that checkout would later reject or clamp differently.

DO $$
DECLARE
  _invalid_products bigint;
  _invalid_coupons bigint;
BEGIN
  SELECT count(*)
    INTO _invalid_products
  FROM public.products
  WHERE price < 0
     OR stock < 0
     OR (original_price IS NOT NULL AND original_price < 0);

  IF _invalid_products > 0 THEN
    RAISE EXCEPTION
      'cannot enforce product numeric bounds: % product rows require reconciliation',
      _invalid_products;
  END IF;

  SELECT count(*)
    INTO _invalid_coupons
  FROM public.coupon_codes
  WHERE discount_value < 0
     OR (discount_type = 'percentage' AND discount_value > 100)
     OR min_order < 0
     OR uses_count < 0
     OR (max_uses IS NOT NULL AND max_uses < 1);

  IF _invalid_coupons > 0 THEN
    RAISE EXCEPTION
      'cannot enforce coupon numeric bounds: % coupon rows require reconciliation',
      _invalid_coupons;
  END IF;
END;
$$;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_price_nonnegative,
  DROP CONSTRAINT IF EXISTS products_original_price_nonnegative,
  DROP CONSTRAINT IF EXISTS products_stock_nonnegative;

ALTER TABLE public.products
  ADD CONSTRAINT products_price_nonnegative CHECK (price >= 0),
  ADD CONSTRAINT products_original_price_nonnegative CHECK (original_price IS NULL OR original_price >= 0),
  ADD CONSTRAINT products_stock_nonnegative CHECK (stock >= 0);

ALTER TABLE public.coupon_codes
  DROP CONSTRAINT IF EXISTS coupon_codes_discount_value_bounds,
  DROP CONSTRAINT IF EXISTS coupon_codes_min_order_nonnegative,
  DROP CONSTRAINT IF EXISTS coupon_codes_max_uses_positive,
  DROP CONSTRAINT IF EXISTS coupon_codes_uses_count_nonnegative;

ALTER TABLE public.coupon_codes
  ADD CONSTRAINT coupon_codes_discount_value_bounds CHECK (
    discount_value >= 0
    AND (discount_type <> 'percentage' OR discount_value <= 100)
  ),
  ADD CONSTRAINT coupon_codes_min_order_nonnegative CHECK (min_order >= 0),
  ADD CONSTRAINT coupon_codes_max_uses_positive CHECK (max_uses IS NULL OR max_uses >= 1),
  ADD CONSTRAINT coupon_codes_uses_count_nonnegative CHECK (uses_count >= 0);
