-- Squashed Migration generated on 2026-07-02T15:10:17.990Z

-- =========================================
-- Legacy platform auth helpers
-- =========================================

DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'co_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, _role::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'co_admin')
  );
$$;

DROP POLICY IF EXISTS "Admins can view roles" ON public.user_roles;
CREATE POLICY "Admins can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =========================================
-- Source: 01_platform_core.sql
-- =========================================

-- Platform-level CMS tables.
-- Canonical sources:
-- - 20260218123954_70d6a7c0-68a0-4844-a600-2672596860ea.sql
-- - 20260702000000_cms_engine_multi_tenant.sql

CREATE TABLE IF NOT EXISTS public.cms_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  monthly_price integer,
  currency_code text NOT NULL DEFAULT 'BDT',
  store_limit integer,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cms_signup_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  phone text,
  business_type text,
  desired_plan text REFERENCES public.cms_plans(id),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_signup_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view CMS plans" ON public.cms_plans;
CREATE POLICY "Anyone can view CMS plans"
  ON public.cms_plans FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Platform admins can manage CMS plans" ON public.cms_plans;
CREATE POLICY "Platform admins can manage CMS plans"
  ON public.cms_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Platform admins can manage CMS signup leads" ON public.cms_signup_leads;
CREATE POLICY "Platform admins can manage CMS signup leads"
  ON public.cms_signup_leads FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- =========================================
-- Source: 02_store_tenancy.sql
-- =========================================

-- Tenant ownership and staff access.
-- Canonical sources:
-- - 20260702000000_cms_engine_multi_tenant.sql
-- - 20260702000001_store_staff_invites.sql

DO $$
BEGIN
  CREATE TYPE public.store_member_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  custom_domain text UNIQUE,
  currency_code text NOT NULL DEFAULT 'BDT',
  locale text NOT NULL DEFAULT 'en-BD',
  plan text NOT NULL DEFAULT 'free',
  store_type text NOT NULL DEFAULT 'clothing',
  logo_url text,
  favicon_url text,
  is_published boolean NOT NULL DEFAULT false,
  lifecycle_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.store_member_role NOT NULL DEFAULT 'owner',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.store_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.cms_plans(id),
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled')),
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  provider text,
  provider_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  email text,
  role public.store_member_role NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'revoked', 'expired')),
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.can_manage_store(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores
    WHERE id = _store_id
      AND owner_id = _user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.store_memberships
    WHERE store_id = _store_id
      AND user_id = _user_id
      AND role IN ('owner', 'admin', 'editor')
  )
  OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_store_admin(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.store_memberships WHERE store_id = _store_id AND user_id = _user_id AND role IN ('owner', 'admin')
  ) OR public.has_role(_user_id, 'admin');
$$;

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_staff_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published stores" ON public.stores;
CREATE POLICY "Anyone can view published stores"
  ON public.stores FOR SELECT
  USING (is_published = true OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store owners can manage stores" ON public.stores;
CREATE POLICY "Store owners can manage stores"
  ON public.stores FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store members can view memberships" ON public.store_memberships;
CREATE POLICY "Store members can view memberships"
  ON public.store_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store owners can manage memberships" ON public.store_memberships;
CREATE POLICY "Store owners can manage memberships"
  ON public.store_memberships FOR ALL
  TO authenticated
  USING (public.is_store_admin(store_id, auth.uid()))
  WITH CHECK (public.is_store_admin(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store members can view subscriptions" ON public.store_subscriptions;
CREATE POLICY "Store members can view subscriptions"
  ON public.store_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_memberships
      WHERE store_memberships.store_id = store_subscriptions.store_id
        AND store_memberships.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Platform admins can manage subscriptions" ON public.store_subscriptions;
CREATE POLICY "Platform admins can manage subscriptions"
  ON public.store_subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store staff can view invites" ON public.store_staff_invites;
CREATE POLICY "Store staff can view invites"
  ON public.store_staff_invites FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()) OR claimed_by = auth.uid());

DROP POLICY IF EXISTS "Store admins can manage invites" ON public.store_staff_invites;
CREATE POLICY "Store admins can manage invites"
  ON public.store_staff_invites FOR ALL
  TO authenticated
  USING (public.is_store_admin(store_id, auth.uid()))
  WITH CHECK (public.is_store_admin(store_id, auth.uid()));


-- =========================================
-- Source: 03_storefront_cms.sql
-- =========================================

-- Storefront CMS content model.
-- Canonical sources:
-- - 20260701000000_storefront_cms_foundation.sql
-- - 20260701000001_storefront_admin_policies.sql

CREATE TABLE IF NOT EXISTS public.store_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  preset_id text NOT NULL DEFAULT 'default',
  mode text NOT NULL DEFAULT 'dark' CHECK (mode IN ('light', 'dark')),
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  typography jsonb NOT NULL DEFAULT '{}'::jsonb,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_css text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  seo_title text,
  seo_description text,
  is_homepage boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);

CREATE TABLE IF NOT EXISTS public.store_page_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.store_pages(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_page_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.store_pages(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  blocks_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  revision_label text NOT NULL DEFAULT 'Auto-save',
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_page_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view themes for published stores" ON public.store_themes;
CREATE POLICY "Anyone can view themes for published stores"
  ON public.store_themes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_themes.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store owners can manage themes" ON public.store_themes;
CREATE POLICY "Store owners can manage themes"
  ON public.store_themes FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view pages for published stores" ON public.store_pages;
CREATE POLICY "Anyone can view pages for published stores"
  ON public.store_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_pages.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store owners can manage pages" ON public.store_pages;
CREATE POLICY "Store owners can manage pages"
  ON public.store_pages FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view blocks for published stores" ON public.store_page_blocks;
CREATE POLICY "Anyone can view blocks for published stores"
  ON public.store_page_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_blocks.store_id
        AND (stores.is_published = true OR public.can_manage_store(stores.id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store owners can manage blocks" ON public.store_page_blocks;
CREATE POLICY "Store owners can manage blocks"
  ON public.store_page_blocks FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store owners can view revisions" ON public.store_page_revisions;
CREATE POLICY "Store owners can view revisions"
  ON public.store_page_revisions FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store owners can manage revisions" ON public.store_page_revisions;
CREATE POLICY "Store owners can manage revisions"
  ON public.store_page_revisions FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));


-- =========================================
-- Source: 04_store_scoped_commerce.sql
-- =========================================

-- Legacy commerce tables upgraded for multi-store CMS use.
-- Canonical sources:
-- - 20260218123954_70d6a7c0-68a0-4844-a600-2672596860ea.sql
-- - 20260218132115_57779cfd-f6f0-4e83-a33a-5e75b6866746.sql
-- - 20260219225544_2c0135ce-b117-48ff-a53e-e51e946a9dc1.sql
-- - 20260220002859_0d9ad5c9-8e5c-4930-a223-0ccfa9a8635e.sql
-- - 20260225001931_69a6ea9a-3df2-45e6-a63a-842d9c9e761d.sql
-- - 20260622000003_stock_notifications.sql
-- - 20260622000005_product_qa.sql
-- - 20260702000000_cms_engine_multi_tenant.sql

ALTER TABLE IF EXISTS public.site_settings
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.cart_items
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.coupon_codes
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.product_categories
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.product_types
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.product_reviews
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.product_qa
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.stock_notifications
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.contact_messages
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.customer_addresses
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_settings_store_key
  ON public.site_settings(store_id, key)
  WHERE store_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_settings_global_key
  ON public.site_settings(key)
  WHERE store_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_store_id ON public.cart_items(store_id);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_store_id ON public.coupon_codes(store_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_store_id ON public.product_categories(store_id);
CREATE INDEX IF NOT EXISTS idx_product_types_store_id ON public.product_types(store_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_store_id ON public.product_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_product_qa_store_id ON public.product_qa(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_store_id ON public.stock_notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_store_id ON public.contact_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_store_id ON public.customer_addresses(store_id);


-- =========================================
-- Source: 05_functions_and_policies.sql
-- =========================================

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



-- =========================================
-- Source: 06_seed_defaults.sql
-- =========================================

-- Default plans and demo tenant seed.
-- Canonical source:
-- - 20260702000000_cms_engine_multi_tenant.sql

INSERT INTO public.cms_plans (id, name, description, monthly_price, store_limit, feature_flags, sort_order)
VALUES
  ('starter', 'Starter', 'Launch one store with core CMS blocks and manual payments.', 0, 1, '{"cms": true, "templates": true, "staff": 1}'::jsonb, 10),
  ('growth', 'Growth', 'Run campaigns, teams, coupons, reviews, and richer storefronts.', 1490, 3, '{"cms": true, "templates": true, "staff": 5, "analytics": true}'::jsonb, 20),
  ('scale', 'Scale', 'Agency and multi-brand package with custom domains and priority help.', NULL, NULL, '{"cms": true, "templates": true, "staff": -1, "custom_domains": true}'::jsonb, 30)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  store_limit = EXCLUDED.store_limit,
  feature_flags = EXCLUDED.feature_flags,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.stores (
  id,
  name,
  slug,
  description,
  currency_code,
  locale,
  plan,
  store_type,
  is_published
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Demo Store',
  'threadbd',
  'A demo storefront generated by Commerce Engine.',
  'BDT',
  'en-BD',
  'starter',
  'clothing',
  true
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO public.store_subscriptions (store_id, plan_id, status)
VALUES ('00000000-0000-4000-8000-000000000001', 'starter', 'active')
ON CONFLICT (store_id) DO UPDATE
SET plan_id = EXCLUDED.plan_id, status = EXCLUDED.status, updated_at = now();

INSERT INTO public.site_settings (store_id, key, value)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'brand_settings',
    '{"name": "Demo Store", "highlight": "", "seo_title": "Commerce Engine Demo Store", "seo_description": "Launch a mobile-first storefront with local payments and CMS-managed pages."}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    'contact_page',
    '{"address": "Dhaka, Bangladesh", "phone": "+880 1XXX-XXXXXX", "email": "hello@example.com"}'::jsonb
  )
ON CONFLICT (store_id, key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();
