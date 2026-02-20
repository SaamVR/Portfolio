
-- Atomic coupon claim function: validates and increments uses_count in a single transaction
-- This prevents race conditions where multiple concurrent requests can bypass the max_uses limit

CREATE OR REPLACE FUNCTION public.claim_coupon(
  _code text,
  _order_total integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coupon coupon_codes%ROWTYPE;
BEGIN
  -- Lock the row and fetch it atomically
  SELECT * INTO _coupon
  FROM public.coupon_codes
  WHERE code = upper(trim(_code))
    AND is_active = true
  FOR UPDATE;

  -- Coupon not found
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired coupon code.');
  END IF;

  -- Check expiry
  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'This coupon has expired.');
  END IF;

  -- Check usage limit (atomic — row is locked)
  IF _coupon.max_uses IS NOT NULL AND _coupon.uses_count >= _coupon.max_uses THEN
    RETURN jsonb_build_object('error', 'This coupon has reached its usage limit.');
  END IF;

  -- Check minimum order
  IF _coupon.min_order > 0 AND _order_total < _coupon.min_order THEN
    RETURN jsonb_build_object('error', format('Minimum order of ৳%s required for this coupon.', _coupon.min_order));
  END IF;

  -- Atomically increment uses_count
  UPDATE public.coupon_codes
  SET uses_count = uses_count + 1,
      updated_at = now()
  WHERE id = _coupon.id;

  -- Return coupon details
  RETURN jsonb_build_object(
    'id', _coupon.id,
    'code', _coupon.code,
    'discount_type', _coupon.discount_type,
    'discount_value', _coupon.discount_value,
    'min_order', _coupon.min_order,
    'max_uses', _coupon.max_uses,
    'uses_count', _coupon.uses_count
  );
END;
$$;
