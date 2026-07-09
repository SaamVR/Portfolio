-- Harden tenant public reads so unpublished stores do not leak commerce data.

DROP POLICY IF EXISTS "Public can view store products" ON public.products;
CREATE POLICY "Public can view published store products"
  ON public.products FOR SELECT
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = products.store_id
        AND stores.is_published = true
    )
  );

DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view published store site settings"
  ON public.site_settings FOR SELECT
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = site_settings.store_id
        AND stores.is_published = true
    )
  );

DROP POLICY IF EXISTS "Public can view store categories" ON public.product_categories;
CREATE POLICY "Public can view published store categories"
  ON public.product_categories FOR SELECT
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = product_categories.store_id
        AND stores.is_published = true
    )
  );

DROP POLICY IF EXISTS "Public can view store types" ON public.product_types;
CREATE POLICY "Public can view published store types"
  ON public.product_types FOR SELECT
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = product_types.store_id
        AND stores.is_published = true
    )
  );

DROP POLICY IF EXISTS "Public can view active store coupons" ON public.coupon_codes;
CREATE POLICY "Public can view active published store coupons"
  ON public.coupon_codes FOR SELECT
  USING (
    is_active = true
    AND store_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = coupon_codes.store_id
        AND stores.is_published = true
    )
  );

DROP POLICY IF EXISTS "Public can view approved store reviews" ON public.product_reviews;
CREATE POLICY "Public can view approved published store reviews"
  ON public.product_reviews FOR SELECT
  USING (
    status = 'approved'
    AND store_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = product_reviews.store_id
        AND stores.is_published = true
    )
  );

DROP POLICY IF EXISTS "Public can view store product QAs" ON public.product_qa;
CREATE POLICY "Public can view published store product QAs"
  ON public.product_qa FOR SELECT
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = product_qa.store_id
        AND stores.is_published = true
    )
  );
