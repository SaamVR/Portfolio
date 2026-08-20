-- Product Q&A is exposed on tenant storefront product pages. Keep the public
-- read and authenticated ask paths strictly bound to the product's owning store.

DROP POLICY IF EXISTS "Authenticated users can ask store questions" ON public.product_qa;
CREATE POLICY "Authenticated users can ask store questions"
  ON public.product_qa FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND store_id IS NOT NULL
    AND product_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id = product_qa.product_id
        AND products.store_id = product_qa.store_id
    )
  );

DROP POLICY IF EXISTS "Public and store managers can view store product QAs" ON public.product_qa;
CREATE POLICY "Public and store managers can view store product QAs"
  ON public.product_qa FOR SELECT
  TO public
  USING (
    store_id IS NOT NULL
    AND product_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id = product_qa.product_id
        AND products.store_id = product_qa.store_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = product_qa.store_id
        AND (
          stores.is_published = true
          OR public.can_manage_store(stores.id, (SELECT auth.uid()))
        )
    )
  );

COMMENT ON TABLE public.product_qa IS
  'Tenant-scoped product questions and merchant answers; product_id must belong to store_id.';
