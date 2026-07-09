-- Fix store_invoices RLS
CREATE POLICY "Store managers can create invoices" ON public.store_invoices
FOR INSERT
TO authenticated
WITH CHECK (
  can_manage_store(store_id, auth.uid())
);

CREATE POLICY "Store managers can update invoices" ON public.store_invoices
FOR UPDATE
TO authenticated
USING (
  can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  can_manage_store(store_id, auth.uid())
);

-- Fix store member RLS gap for products, orders, site_settings 
-- Ensure that the old policies are actually dropped and the new ones apply.
-- Products
DROP POLICY IF EXISTS "Store owners can manage their products" ON public.products;
DROP POLICY IF EXISTS "Store managers can manage products" ON public.products;
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
DROP POLICY IF EXISTS "Store owners can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Store managers can manage orders" ON public.orders;
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
DROP POLICY IF EXISTS "Store owners can manage site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Store managers can manage site settings" ON public.site_settings;
CREATE POLICY "Store managers can manage site settings" ON public.site_settings
FOR ALL
TO authenticated
USING (
  can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  can_manage_store(store_id, auth.uid())
);

-- Product Categories
DROP POLICY IF EXISTS "Store owners can manage product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Store managers can manage product categories" ON public.product_categories;
CREATE POLICY "Store managers can manage product categories" ON public.product_categories
FOR ALL
TO authenticated
USING (
  can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  can_manage_store(store_id, auth.uid())
);

-- Product Types
DROP POLICY IF EXISTS "Store owners can manage product types" ON public.product_types;
DROP POLICY IF EXISTS "Store managers can manage product types" ON public.product_types;
CREATE POLICY "Store managers can manage product types" ON public.product_types
FOR ALL
TO authenticated
USING (
  can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  can_manage_store(store_id, auth.uid())
);

-- Store themes
DROP POLICY IF EXISTS "Store managers can manage themes" ON public.store_themes;
CREATE POLICY "Store managers can manage themes" ON public.store_themes
FOR ALL
TO authenticated
USING (
  can_manage_store(store_id, auth.uid())
)
WITH CHECK (
  can_manage_store(store_id, auth.uid())
);
