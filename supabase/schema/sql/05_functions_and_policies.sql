-- Current store-aware functions, coupon helpers, and RLS for legacy commerce.
-- Canonical source:
-- - 20260702000002_tenant_rls_cleanup.sql

CREATE OR REPLACE FUNCTION public.validate_coupon(
  _code text,
  _order_total integer,
  _store_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coupon coupon_codes%ROWTYPE;
BEGIN
  SELECT * INTO _coupon
  FROM public.coupon_codes
  WHERE code = upper(trim(_code))
    AND is_active = true
    AND store_id = _store_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired coupon code.');
  END IF;

  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'This coupon has expired.');
  END IF;

  IF _coupon.max_uses IS NOT NULL AND _coupon.uses_count >= _coupon.max_uses THEN
    RETURN jsonb_build_object('error', 'This coupon has reached its usage limit.');
  END IF;

  IF _coupon.min_order > 0 AND _order_total < _coupon.min_order THEN
    RETURN jsonb_build_object('error', format('Minimum order of ৳%s required for this coupon.', _coupon.min_order));
  END IF;

  RETURN jsonb_build_object(
    'id', _coupon.id,
    'code', _coupon.code,
    'discount_type', _coupon.discount_type,
    'discount_value', _coupon.discount_value
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_coupon(
  _code text,
  _order_total integer,
  _store_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coupon coupon_codes%ROWTYPE;
BEGIN
  SELECT * INTO _coupon
  FROM public.coupon_codes
  WHERE code = upper(trim(_code))
    AND is_active = true
    AND store_id = _store_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired coupon code.');
  END IF;

  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'This coupon has expired.');
  END IF;

  IF _coupon.max_uses IS NOT NULL AND _coupon.uses_count >= _coupon.max_uses THEN
    RETURN jsonb_build_object('error', 'This coupon has reached its usage limit.');
  END IF;

  IF _coupon.min_order > 0 AND _order_total < _coupon.min_order THEN
    RETURN jsonb_build_object('error', format('Minimum order of ৳%s required for this coupon.', _coupon.min_order));
  END IF;

  UPDATE public.coupon_codes
  SET uses_count = uses_count + 1,
      updated_at = now()
  WHERE id = _coupon.id;

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

-- Products
DROP POLICY IF EXISTS "Public can view store products" ON public.products;
CREATE POLICY "Public can view store products"
  ON public.products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = products.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store staff can insert products" ON public.products;
CREATE POLICY "Store staff can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store staff can update products" ON public.products;
CREATE POLICY "Store staff can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store staff can delete products" ON public.products;
CREATE POLICY "Store staff can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

-- Site settings
DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view site settings"
  ON public.site_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = site_settings.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store staff can manage site settings" ON public.site_settings;
CREATE POLICY "Store staff can manage site settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

-- Orders
DROP POLICY IF EXISTS "Customers can create store orders" ON public.orders;
CREATE POLICY "Customers can create store orders"
  ON public.orders FOR INSERT
  WITH CHECK (store_id IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

DROP POLICY IF EXISTS "Customers can view own store orders" ON public.orders;
CREATE POLICY "Customers can view own store orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND store_id IS NOT NULL);

DROP POLICY IF EXISTS "Store staff can view all store orders" ON public.orders;
CREATE POLICY "Store staff can view all store orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store staff can update store orders" ON public.orders;
CREATE POLICY "Store staff can update store orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

-- Customer addresses
DROP POLICY IF EXISTS "Customers can manage own store addresses" ON public.customer_addresses;
CREATE POLICY "Customers can manage own store addresses"
  ON public.customer_addresses FOR ALL
  TO authenticated
  USING (user_id = auth.uid() AND store_id IS NOT NULL)
  WITH CHECK (user_id = auth.uid() AND store_id IS NOT NULL);

-- Contact messages
DROP POLICY IF EXISTS "Anyone can create store contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can create store contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (store_id IS NOT NULL);

DROP POLICY IF EXISTS "Store staff can view store contact messages" ON public.contact_messages;
CREATE POLICY "Store staff can view store contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store staff can update store contact messages" ON public.contact_messages;
CREATE POLICY "Store staff can update store contact messages"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

-- Cart items
DROP POLICY IF EXISTS "Customers can manage own store cart" ON public.cart_items;
CREATE POLICY "Customers can manage own store cart"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (user_id = auth.uid() AND store_id IS NOT NULL)
  WITH CHECK (user_id = auth.uid() AND store_id IS NOT NULL);

-- Coupons
DROP POLICY IF EXISTS "Public can view active store coupons" ON public.coupon_codes;
CREATE POLICY "Public can view active store coupons"
  ON public.coupon_codes FOR SELECT
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = coupon_codes.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store staff can manage coupons" ON public.coupon_codes;
CREATE POLICY "Store staff can manage coupons"
  ON public.coupon_codes FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

-- Reviews
DROP POLICY IF EXISTS "Public can view approved store reviews" ON public.product_reviews;
CREATE POLICY "Public can view approved store reviews"
  ON public.product_reviews FOR SELECT
  USING (
    status = 'approved' 
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = product_reviews.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Customers can view own store reviews" ON public.product_reviews;
CREATE POLICY "Customers can view own store reviews"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND store_id IS NOT NULL);

DROP POLICY IF EXISTS "Customers can insert own store reviews" ON public.product_reviews;
CREATE POLICY "Customers can insert own store reviews"
  ON public.product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND store_id IS NOT NULL);

DROP POLICY IF EXISTS "Store staff can moderate store reviews" ON public.product_reviews;
CREATE POLICY "Store staff can moderate store reviews"
  ON public.product_reviews FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

-- Categories and types
DROP POLICY IF EXISTS "Public can view store categories" ON public.product_categories;
CREATE POLICY "Public can view store categories"
  ON public.product_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = product_categories.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store staff can manage categories" ON public.product_categories;
CREATE POLICY "Store staff can manage categories"
  ON public.product_categories FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Public can view store types" ON public.product_types;
CREATE POLICY "Public can view store types"
  ON public.product_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = product_types.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store staff can manage types" ON public.product_types;
CREATE POLICY "Store staff can manage types"
  ON public.product_types FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

-- Stock notifications
DROP POLICY IF EXISTS "Anyone can insert store stock notifications" ON public.stock_notifications;
CREATE POLICY "Anyone can insert store stock notifications"
  ON public.stock_notifications FOR INSERT
  WITH CHECK (store_id IS NOT NULL);

DROP POLICY IF EXISTS "Customers can view own store stock notifications" ON public.stock_notifications;
CREATE POLICY "Customers can view own store stock notifications"
  ON public.stock_notifications FOR SELECT
  TO authenticated
  USING (
    store_id IS NOT NULL
    AND (
      user_id = auth.uid()
      OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Store staff can manage stock notifications" ON public.stock_notifications;
CREATE POLICY "Store staff can manage stock notifications"
  ON public.stock_notifications FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

-- Product QA
DROP POLICY IF EXISTS "Public can view store product QAs" ON public.product_qa;
CREATE POLICY "Public can view store product QAs"
  ON public.product_qa FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = product_qa.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Authenticated users can ask store questions" ON public.product_qa;
CREATE POLICY "Authenticated users can ask store questions"
  ON public.product_qa FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid() AND store_id IS NOT NULL);

DROP POLICY IF EXISTS "Store staff can manage store product QAs" ON public.product_qa;
CREATE POLICY "Store staff can manage store product QAs"
  ON public.product_qa FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

-- Helper function to lookup user ID by email securely (for auth-bridge compatibility)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_to_find text)
RETURNS uuid
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = email_to_find LIMIT 1;
  RETURN user_id;
END;
$$;

