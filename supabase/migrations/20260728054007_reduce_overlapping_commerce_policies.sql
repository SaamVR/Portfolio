-- Reduce overlapping authenticated policies on commerce tables while preserving
-- the same access model for public reads, customer actions, and store staff writes.

DROP POLICY IF EXISTS "Store staff can manage coupons" ON public.coupon_codes;
DROP POLICY IF EXISTS "Store staff can insert coupons" ON public.coupon_codes;
DROP POLICY IF EXISTS "Store staff can update coupons" ON public.coupon_codes;
DROP POLICY IF EXISTS "Store staff can delete coupons" ON public.coupon_codes;
CREATE POLICY "Store staff can insert coupons"
  ON public.coupon_codes FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_store(store_id, (SELECT auth.uid())));

CREATE POLICY "Store staff can update coupons"
  ON public.coupon_codes FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())))
  WITH CHECK (public.can_manage_store(store_id, (SELECT auth.uid())));

CREATE POLICY "Store staff can delete coupons"
  ON public.coupon_codes FOR DELETE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Store managers can manage product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Store staff can manage categories" ON public.product_categories;
DROP POLICY IF EXISTS "Store staff can update categories" ON public.product_categories;
DROP POLICY IF EXISTS "Store staff can delete categories" ON public.product_categories;
CREATE POLICY "Store staff can manage categories"
  ON public.product_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_store(store_id, (SELECT auth.uid())));

CREATE POLICY "Store staff can update categories"
  ON public.product_categories FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())))
  WITH CHECK (public.can_manage_store(store_id, (SELECT auth.uid())));

CREATE POLICY "Store staff can delete categories"
  ON public.product_categories FOR DELETE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can ask store questions" ON public.product_qa;
CREATE POLICY "Authenticated users can ask store questions"
  ON public.product_qa FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND store_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Store staff can manage store product QAs" ON public.product_qa;
DROP POLICY IF EXISTS "Store staff can update store product QAs" ON public.product_qa;
DROP POLICY IF EXISTS "Store staff can delete store product QAs" ON public.product_qa;
CREATE POLICY "Store staff can update store product QAs"
  ON public.product_qa FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())))
  WITH CHECK (public.can_manage_store(store_id, (SELECT auth.uid())));

CREATE POLICY "Store staff can delete store product QAs"
  ON public.product_qa FOR DELETE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Customers can insert own store reviews" ON public.product_reviews;
CREATE POLICY "Customers can insert own store reviews"
  ON public.product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND store_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Customers can view own store reviews" ON public.product_reviews;
CREATE POLICY "Customers can view own store reviews"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND store_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Store staff can moderate store reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Store staff can update store reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Store staff can delete store reviews" ON public.product_reviews;
CREATE POLICY "Store staff can update store reviews"
  ON public.product_reviews FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())))
  WITH CHECK (public.can_manage_store(store_id, (SELECT auth.uid())));

CREATE POLICY "Store staff can delete store reviews"
  ON public.product_reviews FOR DELETE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Store managers can manage product types" ON public.product_types;
DROP POLICY IF EXISTS "Store staff can manage types" ON public.product_types;
DROP POLICY IF EXISTS "Store staff can insert product types" ON public.product_types;
DROP POLICY IF EXISTS "Store staff can update product types" ON public.product_types;
DROP POLICY IF EXISTS "Store staff can delete product types" ON public.product_types;
CREATE POLICY "Store staff can insert product types"
  ON public.product_types FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_store(store_id, (SELECT auth.uid())));

CREATE POLICY "Store staff can update product types"
  ON public.product_types FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())))
  WITH CHECK (public.can_manage_store(store_id, (SELECT auth.uid())));

CREATE POLICY "Store staff can delete product types"
  ON public.product_types FOR DELETE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Store managers can manage products" ON public.products;
DROP POLICY IF EXISTS "Store staff can insert products" ON public.products;
DROP POLICY IF EXISTS "Store staff can update products" ON public.products;
DROP POLICY IF EXISTS "Store staff can delete products" ON public.products;
CREATE POLICY "Store staff can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_store(store_id, (SELECT auth.uid())));

CREATE POLICY "Store staff can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())))
  WITH CHECK (public.can_manage_store(store_id, (SELECT auth.uid())));

CREATE POLICY "Store staff can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.can_manage_store(store_id, (SELECT auth.uid())));
