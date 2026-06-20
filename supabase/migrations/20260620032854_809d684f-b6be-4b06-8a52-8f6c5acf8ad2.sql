
-- 1. Fix security definer view: enable security_invoker
ALTER VIEW public.public_product_reviews SET (security_invoker = true);

-- 2. Fix orders INSERT policy: must be self or anonymous guest checkout (user_id null only)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Users can create their own orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- 3. Coupon codes: stop exposing business strategy publicly. Drop public SELECT;
-- validation goes through SECURITY DEFINER claim_coupon RPC.
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupon_codes;

-- 4. product_reviews: hide user_id/order_id from public reads via column-level revoke
REVOKE SELECT ON public.product_reviews FROM anon, authenticated;
GRANT SELECT (id, product_id, author_name, rating, review_text, size_purchased, status, admin_reply, created_at, updated_at)
  ON public.product_reviews TO anon, authenticated;
-- Admin reads still work because admin policies run via has_role; admins query through service role or
-- need full column access. Re-grant all columns to authenticated for admin UI:
GRANT SELECT (user_id, order_id) ON public.product_reviews TO authenticated;
