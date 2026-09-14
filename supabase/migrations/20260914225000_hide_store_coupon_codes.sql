-- Keep coupon discovery private to store managers.
-- Storefront shoppers validate a code through validate_coupon(..., store_id)
-- rather than enumerating the coupon table.

DROP POLICY IF EXISTS "Public and store managers can view active store coupons"
  ON public.coupon_codes;
DROP POLICY IF EXISTS "Public can view active published store coupons"
  ON public.coupon_codes;
DROP POLICY IF EXISTS "Public can view active store coupons"
  ON public.coupon_codes;
DROP POLICY IF EXISTS "Store managers can view store coupons"
  ON public.coupon_codes;

CREATE POLICY "Store managers can view store coupons"
  ON public.coupon_codes
  FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())));

REVOKE SELECT ON TABLE public.coupon_codes FROM anon;
REVOKE SELECT ON TABLE public.coupon_codes FROM PUBLIC;

-- validate_coupon remains the storefront-safe code-by-code read surface.
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, integer, uuid)
  TO anon, authenticated;
