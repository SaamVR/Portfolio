-- ============================================================
-- THREADBD DATABASE SCHEMA
-- Complete schema export with RLS policies, functions, triggers
-- Generated: 2026-02-28
-- ============================================================

-- =====================
-- 1. ENUMS
-- =====================
CREATE TYPE public.app_role AS ENUM ('admin', 'co_admin');

-- =====================
-- 2. TABLES
-- =====================

-- Profiles (public user info, auto-created on signup)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User roles (separate from profiles for security)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Product categories
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.product_categories(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Product types
CREATE TABLE public.product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price integer NOT NULL,
  original_price integer,
  image_url text NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  sizes text[] NOT NULL DEFAULT '{}',
  colors text[] NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT 'Essentials',
  type text NOT NULL DEFAULT 'T-Shirt',
  featured boolean NOT NULL DEFAULT false,
  badge text,
  stock integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Cart items
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id),
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Customer addresses
CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  label text NOT NULL DEFAULT 'Home',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  order_number text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  shipping_address text NOT NULL,
  shipping_city text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal integer NOT NULL DEFAULT 0,
  delivery_fee integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Product reviews
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  rating integer NOT NULL,
  review_text text,
  size_purchased text,
  status text NOT NULL DEFAULT 'pending',
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Coupon codes
CREATE TABLE public.coupon_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value integer NOT NULL DEFAULT 0,
  min_order integer NOT NULL DEFAULT 0,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Contact messages
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Invite codes (for admin onboarding)
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  role app_role NOT NULL DEFAULT 'co_admin',
  created_by uuid,
  used_by uuid,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Site settings (key-value store)
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- 3. VIEW (hides sensitive data from public review queries)
-- =====================
CREATE OR REPLACE VIEW public.public_product_reviews AS
SELECT
  id,
  product_id,
  author_name,
  rating,
  review_text,
  size_purchased,
  admin_reply,
  created_at
FROM public.product_reviews
WHERE status = 'approved';

-- =====================
-- 4. FUNCTIONS
-- =====================

-- Check if user has a specific role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is any admin (admin or co_admin)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'co_admin')
  )
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.order_number := 'TBD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  RETURN NEW;
END;
$$;

-- Auto-set is_available=false when stock hits 0
CREATE OR REPLACE FUNCTION public.check_stock_availability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.stock <= 0 THEN
    NEW.is_available = false;
  END IF;
  RETURN NEW;
END;
$$;

-- Contact form rate limiter (max 5 per hour per email)
CREATE OR REPLACE FUNCTION public.check_contact_rate_limit(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < 5
  FROM public.contact_messages
  WHERE email = lower(trim(_email))
    AND created_at > now() - INTERVAL '1 hour';
$$;

-- Coupon claim function (atomic with row locking)
CREATE OR REPLACE FUNCTION public.claim_coupon(_code text, _order_total integer)
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
  SET uses_count = uses_count + 1, updated_at = now()
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

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$;

-- =====================
-- 5. TRIGGERS
-- =====================

-- Updated_at triggers
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupon_codes_updated_at
  BEFORE UPDATE ON public.coupon_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Order number auto-generation
CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Stock availability check
CREATE TRIGGER check_stock_trigger
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.check_stock_availability();

-- Auto-create profile on auth.users insert
-- NOTE: Run this in Supabase SQL editor (requires access to auth schema)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (is_admin(auth.uid()));

-- USER ROLES
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- PRODUCTS (publicly readable)
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Only main admin can delete products" ON public.products FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- PRODUCT CATEGORIES (publicly readable)
CREATE POLICY "Anyone can view categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.product_categories FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- PRODUCT TYPES (publicly readable)
CREATE POLICY "Anyone can view types" ON public.product_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage types" ON public.product_types FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- CART ITEMS (user-scoped)
CREATE POLICY "Users can manage own cart" ON public.cart_items FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- CUSTOMER ADDRESSES (user-scoped)
CREATE POLICY "Users can manage own addresses" ON public.customer_addresses FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ORDERS
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (is_admin(auth.uid()));

-- PRODUCT REVIEWS
CREATE POLICY "Authenticated users can insert own reviews" ON public.product_reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone can view approved reviews" ON public.product_reviews FOR SELECT USING (status = 'approved');
CREATE POLICY "Admins can view all reviews" ON public.product_reviews FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update reviews" ON public.product_reviews FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete reviews" ON public.product_reviews FOR DELETE USING (is_admin(auth.uid()));

-- COUPON CODES
CREATE POLICY "Anyone can view active coupons" ON public.coupon_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coupons" ON public.coupon_codes FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- CONTACT MESSAGES
CREATE POLICY "Anyone can create contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view contact messages" ON public.contact_messages FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Admins can update contact messages" ON public.contact_messages FOR UPDATE USING (is_admin(auth.uid()));

-- INVITE CODES
CREATE POLICY "Admins can manage invite codes" ON public.invite_codes FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- SITE SETTINGS (publicly readable, admin writable)
CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Main admin can manage site settings" ON public.site_settings FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- =====================
-- 7. STORAGE BUCKETS
-- =====================
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-media', 'hero-media', true);

CREATE POLICY "Public can view hero media" ON storage.objects FOR SELECT USING (bucket_id = 'hero-media');
CREATE POLICY "Admins can upload hero media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'hero-media' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can update hero media" ON storage.objects FOR UPDATE USING (bucket_id = 'hero-media' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete hero media" ON storage.objects FOR DELETE USING (bucket_id = 'hero-media' AND public.is_admin(auth.uid()));
