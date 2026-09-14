-- Rollback-only positive/negative regression for P1 #313.
-- Requires 20260914211000_scope_coupon_codes_per_store.sql to be applied.
BEGIN;

DO $$
DECLARE
  _store_a uuid := 'd1300000-0000-4000-8000-000000000001'::uuid;
  _store_b uuid := 'd1300000-0000-4000-8000-000000000002'::uuid;
  _cross_store_count integer;
  _normalized_count integer;
BEGIN
  INSERT INTO public.stores (id, name, slug)
  VALUES
    (_store_a, 'Coupon Scope Smoke A', 'coupon-scope-smoke-a'),
    (_store_b, 'Coupon Scope Smoke B', 'coupon-scope-smoke-b');

  -- Different stores must be allowed to own the same canonical code even when
  -- the submitted casing/whitespace differs.
  INSERT INTO public.coupon_codes (store_id, code, discount_type, discount_value)
  VALUES
    (_store_a, '  welcome10  ', 'percentage', 10),
    (_store_b, 'WELCOME10', 'percentage', 10);

  SELECT count(*)
    INTO _cross_store_count
    FROM public.coupon_codes
   WHERE store_id IN (_store_a, _store_b)
     AND code = 'WELCOME10';

  IF _cross_store_count <> 2 THEN
    RAISE EXCEPTION 'coupon scope smoke failed: same code was not preserved across two stores';
  END IF;

  SELECT count(*)
    INTO _normalized_count
    FROM public.coupon_codes
   WHERE store_id IN (_store_a, _store_b)
     AND code = upper(trim(code));

  IF _normalized_count <> 2 THEN
    RAISE EXCEPTION 'coupon scope smoke failed: coupon normalization did not canonicalize both rows';
  END IF;

  -- The same canonical code inside one store must still fail.
  BEGIN
    INSERT INTO public.coupon_codes (store_id, code, discount_type, discount_value)
    VALUES (_store_a, 'Welcome10', 'percentage', 10);

    RAISE EXCEPTION 'coupon scope smoke failed: same-store duplicate was accepted';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END;
$$;

ROLLBACK;
