-- Repair policy calls that used can_manage_store(auth.uid(), store_id).
-- The function signature is can_manage_store(_store_id uuid, _user_id uuid).

DROP POLICY IF EXISTS "Store managers can view invoices" ON public.store_invoices;
CREATE POLICY "Store managers can view invoices" ON public.store_invoices
FOR SELECT
TO authenticated
USING (
  public.can_manage_store(store_id, auth.uid())
);

DROP POLICY IF EXISTS "Store managers can create invoices" ON public.store_invoices;
CREATE POLICY "Store managers can create invoices" ON public.store_invoices
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_store(store_id, auth.uid())
);

DROP POLICY IF EXISTS "Store managers can update invoices" ON public.store_invoices;
CREATE POLICY "Store managers can update invoices" ON public.store_invoices
FOR UPDATE
TO authenticated
USING (
  public.can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  public.can_manage_store(store_id, auth.uid())
);

DROP POLICY IF EXISTS "Store managers can manage products" ON public.products;
CREATE POLICY "Store managers can manage products" ON public.products
FOR ALL
TO authenticated
USING (
  public.can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  public.can_manage_store(store_id, auth.uid())
);

DROP POLICY IF EXISTS "Store managers can manage orders" ON public.orders;
CREATE POLICY "Store managers can manage orders" ON public.orders
FOR ALL
TO authenticated
USING (
  public.can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  public.can_manage_store(store_id, auth.uid())
);

DROP POLICY IF EXISTS "Store managers can manage site settings" ON public.site_settings;
CREATE POLICY "Store managers can manage site settings" ON public.site_settings
FOR ALL
TO authenticated
USING (
  public.can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  public.can_manage_store(store_id, auth.uid())
);

DROP POLICY IF EXISTS "Store managers can manage product categories" ON public.product_categories;
CREATE POLICY "Store managers can manage product categories" ON public.product_categories
FOR ALL
TO authenticated
USING (
  public.can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  public.can_manage_store(store_id, auth.uid())
);

DROP POLICY IF EXISTS "Store managers can manage product types" ON public.product_types;
CREATE POLICY "Store managers can manage product types" ON public.product_types
FOR ALL
TO authenticated
USING (
  public.can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  public.can_manage_store(store_id, auth.uid())
);

DROP POLICY IF EXISTS "Store managers can manage themes" ON public.store_themes;
CREATE POLICY "Store managers can manage themes" ON public.store_themes
FOR ALL
TO authenticated
USING (
  public.can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  public.can_manage_store(store_id, auth.uid())
);
