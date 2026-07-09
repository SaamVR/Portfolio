-- Drop existing policies that might be checking for direct ownership
DROP POLICY IF EXISTS "Store owners can manage their products" ON public.products;
DROP POLICY IF EXISTS "Store owners can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can manage site settings" ON public.site_settings;

-- Products
CREATE POLICY "Store managers can manage products" ON public.products
FOR ALL
TO authenticated
USING (
  can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  can_manage_store(store_id, auth.uid())
);

-- Orders
CREATE POLICY "Store managers can manage orders" ON public.orders
FOR ALL
TO authenticated
USING (
  can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  can_manage_store(store_id, auth.uid())
);

-- Site Settings
CREATE POLICY "Store managers can manage site settings" ON public.site_settings
FOR ALL
TO authenticated
USING (
  can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  can_manage_store(store_id, auth.uid())
);
