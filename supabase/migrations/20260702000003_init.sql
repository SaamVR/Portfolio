-- ==================================================
-- MIGRATION: 20260218123954_70d6a7c0-68a0-4844-a600-2672596860ea.sql
-- ==================================================


-- Role enum
DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'co_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: is any admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'co_admin')
  )
$$;

-- RLS for user_roles: only admins can read
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

-- Users can see own role
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Invite codes table
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  role app_role NOT NULL DEFAULT 'co_admin',
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invite codes"
  ON public.invite_codes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Products table (DB-backed with stock)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  original_price INTEGER,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sizes TEXT[] NOT NULL DEFAULT '{}',
  colors TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'Essentials',
  type TEXT NOT NULL DEFAULT 'T-Shirt',
  featured BOOLEAN NOT NULL DEFAULT false,
  badge TEXT CHECK (badge IN ('New', 'Sale', NULL)),
  stock INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Everyone can read products
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  USING (true);

-- Admins and co-admins can insert/update products
CREATE POLICY "Admins can manage products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Only main admin can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set is_available based on stock
CREATE OR REPLACE FUNCTION public.check_stock_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock <= 0 THEN
    NEW.is_available = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER check_product_stock
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.check_stock_availability();

-- Site settings table (key-value for CMS)
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read site settings
CREATE POLICY "Anyone can view site settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Only main admin can edit site settings
CREATE POLICY "Main admin can manage site settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles table for user display info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('announcement_bar', '{"text": "Free shipping on orders over ৳2000 🚚", "enabled": true, "link": "/shop"}'),
  ('hero_section', '{"title": "Elevate Your Style", "subtitle": "Premium menswear crafted for the modern gentleman", "cta_text": "Shop Now", "cta_link": "/shop"}'),
  ('footer', '{"about_text": "THREADBD — Premium menswear for the modern Bangladeshi man.", "social_links": {}}'),
  ('about_page', '{"title": "About THREADBD", "content": "We are a premium menswear brand based in Bangladesh."}');


-- ==================================================
-- MIGRATION: 20260218132115_57779cfd-f6f0-4e83-a33a-5e75b6866746.sql
-- ==================================================


-- Orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal integer NOT NULL DEFAULT 0,
  delivery_fee integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  shipping_address text NOT NULL,
  shipping_city text NOT NULL,
  payment_method text NOT NULL DEFAULT 'cod',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anyone can insert orders (guest checkout support)
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update orders
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generate order number function
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

CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Customer addresses table
CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses"
  ON public.customer_addresses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Contact messages table
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can submit contact messages
CREATE POLICY "Anyone can create contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- Admins can view contact messages
CREATE POLICY "Admins can view contact messages"
  ON public.contact_messages FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update contact messages (mark as read)
CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Cart items table for persistent cart
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id, size)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cart"
  ON public.cart_items FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ==================================================
-- MIGRATION: 20260219005816_2e73f07e-e175-4ac6-9bcf-52819f80237a.sql
-- ==================================================


-- Add images array to products table for multi-image gallery (up to 5)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}';


-- ==================================================
-- MIGRATION: 20260219011330_acc79ce7-6f98-4937-9929-31c1e0846a5f.sql
-- ==================================================


-- Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS generate_order_number ON public.orders;
DROP TRIGGER IF EXISTS set_order_number ON public.orders;
DROP TRIGGER IF EXISTS check_stock_availability ON public.products;
DROP TRIGGER IF EXISTS check_product_stock ON public.products;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;

-- Re-create all triggers
CREATE TRIGGER generate_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

CREATE TRIGGER check_stock_availability
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stock_availability();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed site_settings
INSERT INTO public.site_settings (key, value) VALUES
  ('payment_settings', '{"bkash_number": "", "nagad_number": "", "bkash_enabled": false, "nagad_enabled": false}'::jsonb),
  ('faq_entries', '[{"q": "What is your return policy?", "a": "We accept returns within 3 days of delivery."}, {"q": "How long does delivery take?", "a": "Delivery takes 2-5 business days inside Dhaka, 5-7 days outside."}, {"q": "Do you offer Cash on Delivery?", "a": "Yes, we offer COD across Bangladesh."}]'::jsonb),
  ('contact_page', '{"address": "Dhaka, Bangladesh", "phone": "+880 1XXX-XXXXXX", "email": "hello@threadbd.com"}'::jsonb),
  ('categories', '[{"label": "T-Shirts", "value": "T-Shirt"}, {"label": "Polos", "value": "Polo"}, {"label": "Shirts", "value": "Shirt"}, {"label": "Trousers", "value": "Trousers"}, {"label": "Innerwear", "value": "Innerwear"}]'::jsonb),
  ('seo_settings', '{"site_title": "ThreadBD - Premium Streetwear Bangladesh", "meta_description": "Shop premium streetwear, t-shirts, polos, and more from ThreadBD. Free delivery across Bangladesh.", "og_image": "", "keywords": "streetwear, bangladesh, t-shirt, fashion, clothing"}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ==================================================
-- MIGRATION: 20260219225544_2c0135ce-b117-48ff-a53e-e51e946a9dc1.sql
-- ==================================================


-- Create coupon_codes table
CREATE TABLE public.coupon_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value integer NOT NULL DEFAULT 0,
  min_order integer NOT NULL DEFAULT 0,
  max_uses integer NULL,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read active coupons (needed for checkout validation)
CREATE POLICY "Anyone can view active coupons"
ON public.coupon_codes
FOR SELECT
USING (is_active = true);

-- Admins can manage all coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupon_codes
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_coupon_codes_updated_at
BEFORE UPDATE ON public.coupon_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default delivery_settings into site_settings
INSERT INTO public.site_settings (key, value)
VALUES ('delivery_settings', '{"enabled": true, "free_threshold": 2000, "delivery_fee": 80}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ==================================================
-- MIGRATION: 20260220002859_0d9ad5c9-8e5c-4930-a223-0ccfa9a8635e.sql
-- ==================================================


-- Create product_reviews table
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  size_purchased text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id, order_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON public.product_reviews FOR SELECT
  USING (status = 'approved');

-- Authenticated users can insert their own reviews
CREATE POLICY "Authenticated users can insert own reviews"
  ON public.product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can read ALL reviews (pending, approved, rejected)
CREATE POLICY "Admins can view all reviews"
  ON public.product_reviews FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update any review (approve, reject, reply)
CREATE POLICY "Admins can update reviews"
  ON public.product_reviews FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Admins can delete reviews
CREATE POLICY "Admins can delete reviews"
  ON public.product_reviews FOR DELETE
  USING (public.is_admin(auth.uid()));


-- ==================================================
-- MIGRATION: 20260220010306_86e0adb2-509a-4563-a8b8-5800547de9e7.sql
-- ==================================================


-- Atomic coupon claim function: validates and increments uses_count in a single transaction
-- This prevents race conditions where multiple concurrent requests can bypass the max_uses limit

CREATE OR REPLACE FUNCTION public.claim_coupon(
  _code text,
  _order_total integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coupon coupon_codes%ROWTYPE;
BEGIN
  -- Lock the row and fetch it atomically
  SELECT * INTO _coupon
  FROM public.coupon_codes
  WHERE code = upper(trim(_code))
    AND is_active = true
  FOR UPDATE;

  -- Coupon not found
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired coupon code.');
  END IF;

  -- Check expiry
  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'This coupon has expired.');
  END IF;

  -- Check usage limit (atomic — row is locked)
  IF _coupon.max_uses IS NOT NULL AND _coupon.uses_count >= _coupon.max_uses THEN
    RETURN jsonb_build_object('error', 'This coupon has reached its usage limit.');
  END IF;

  -- Check minimum order
  IF _coupon.min_order > 0 AND _order_total < _coupon.min_order THEN
    RETURN jsonb_build_object('error', format('Minimum order of ৳%s required for this coupon.', _coupon.min_order));
  END IF;

  -- Atomically increment uses_count
  UPDATE public.coupon_codes
  SET uses_count = uses_count + 1,
      updated_at = now()
  WHERE id = _coupon.id;

  -- Return coupon details
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


-- ==================================================
-- MIGRATION: 20260220010916_2003e013-27c0-477d-9419-624c254b7e0a.sql
-- ==================================================


-- 1. Server-side length constraints on review_text to enforce data integrity
ALTER TABLE public.product_reviews
  ADD CONSTRAINT review_text_max_length CHECK (char_length(review_text) <= 500),
  ADD CONSTRAINT review_text_min_length CHECK (review_text IS NULL OR char_length(trim(review_text)) >= 0),
  ADD CONSTRAINT author_name_max_length CHECK (char_length(author_name) <= 100);

-- 2. Server-side length constraints on contact_messages to prevent abuse
ALTER TABLE public.contact_messages
  ADD CONSTRAINT contact_name_max_length CHECK (char_length(name) <= 100),
  ADD CONSTRAINT contact_email_max_length CHECK (char_length(email) <= 255),
  ADD CONSTRAINT contact_message_max_length CHECK (char_length(message) <= 2000),
  ADD CONSTRAINT contact_message_min_length CHECK (char_length(trim(message)) >= 10);

-- 3. Rate limiting function for contact form submissions (per email, 5 per hour)
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


-- ==================================================
-- MIGRATION: 20260220140653_8719a4cf-d615-450c-bc78-10f7a87932d0.sql
-- ==================================================

-- Create a public view for product reviews that excludes sensitive identifiers
-- This prevents user_id and order_id from being exposed in public queries
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

-- Grant read access on the view to anon and authenticated roles
GRANT SELECT ON public.public_product_reviews TO anon, authenticated;


-- ==================================================
-- MIGRATION: 20260220140712_389c8ec7-6a6f-49fd-87e2-52074f27066f.sql
-- ==================================================

-- Re-create the view with SECURITY INVOKER to avoid security definer issue
DROP VIEW IF EXISTS public.public_product_reviews;

CREATE VIEW public.public_product_reviews
  WITH (security_invoker = true)
AS
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

-- Grant read access on the view
GRANT SELECT ON public.public_product_reviews TO anon, authenticated;


-- ==================================================
-- MIGRATION: 20260220192650_a6b88813-a3b9-4497-8cb0-1836966cc97a.sql
-- ==================================================


-- Fix contact_messages RLS: restrict SELECT and UPDATE policies to authenticated role only
-- This prevents any theoretical anonymous access to customer PII

-- Drop the existing broad policies (assigned to public role)
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;

-- Re-create SELECT policy scoped to authenticated role only
CREATE POLICY "Admins can view contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Re-create UPDATE policy scoped to authenticated role only
CREATE POLICY "Admins can update contact messages"
ON public.contact_messages
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));


-- ==================================================
-- MIGRATION: 20260224135958_39bc189b-57ae-4dd4-a945-2b8c3a7ed880.sql
-- ==================================================


-- Create storage bucket for hero media (images/videos)
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-media', 'hero-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view hero media
CREATE POLICY "Anyone can view hero media"
ON storage.objects FOR SELECT
USING (bucket_id = 'hero-media');

-- Admins can upload hero media
CREATE POLICY "Admins can upload hero media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hero-media' AND public.is_admin(auth.uid()));

-- Admins can update hero media
CREATE POLICY "Admins can update hero media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'hero-media' AND public.is_admin(auth.uid()));

-- Admins can delete hero media
CREATE POLICY "Admins can delete hero media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'hero-media' AND public.is_admin(auth.uid()));


-- ==================================================
-- MIGRATION: 20260225001931_69a6ea9a-3df2-45e6-a63a-842d9c9e761d.sql
-- ==================================================


-- Categories table with parent_id for subcategories
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.product_categories FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Product types table
CREATE TABLE public.product_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view types" ON public.product_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage types" ON public.product_types FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Seed existing categories
INSERT INTO public.product_categories (name, sort_order) VALUES
  ('Essentials', 1),
  ('Premium', 2),
  ('Street', 3);

-- Seed existing types
INSERT INTO public.product_types (name, sort_order) VALUES
  ('T-Shirt', 1),
  ('Polo', 2),
  ('Shirt', 3),
  ('Drop Shoulder', 4),
  ('Undergarment', 5),
  ('Pants', 6);


-- ==================================================
-- MIGRATION: 20260620032854_809d684f-b6be-4b06-8a52-8f6c5acf8ad2.sql
-- ==================================================


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


-- ==================================================
-- MIGRATION: 20260622000000_validate_coupon.sql
-- ==================================================

CREATE OR REPLACE FUNCTION public.validate_coupon(
  _code text,
  _order_total integer
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
    AND is_active = true;

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


-- ==================================================
-- MIGRATION: 20260622000001_add_image_url_to_reviews.sql
-- ==================================================

ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS image_url text; CREATE OR REPLACE VIEW public.public_product_reviews WITH (security_invoker = true) AS SELECT id, product_id, author_name, rating, review_text, size_purchased, admin_reply, created_at, image_url FROM public.product_reviews WHERE status = 'approved';  


-- ==================================================
-- MIGRATION: 20260622000002_optional_order_id.sql
-- ==================================================

ALTER TABLE public.product_reviews ALTER COLUMN order_id DROP NOT NULL;  


-- ==================================================
-- MIGRATION: 20260622000003_stock_notifications.sql
-- ==================================================

-- Create stock_notifications table
CREATE TABLE IF NOT EXISTS public.stock_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, email)
);

-- Enable RLS
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert stock notifications
CREATE POLICY "Anyone can insert stock notifications"
  ON public.stock_notifications FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own stock notifications
CREATE POLICY "Users can view own stock notifications"
  ON public.stock_notifications FOR SELECT
  USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow admins to manage all stock notifications
CREATE POLICY "Admins can manage all stock notifications"
  ON public.stock_notifications FOR ALL
  USING (public.is_admin(auth.uid()));


-- ==================================================
-- MIGRATION: 20260622000004_seed_countdown_timer.sql
-- ==================================================

-- Seed countdown timer site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('countdown_timer', jsonb_build_object(
    'enabled', true,
    'title', 'Eid Special Flash Sale! ⚡',
    'end_date', to_char(now() + interval '5 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'cta_text', 'Shop The Sale',
    'cta_link', '/shop',
    'bg_gradient', 'from-red-600 via-orange-600 to-amber-600'
  ))
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;


-- ==================================================
-- MIGRATION: 20260622000005_product_qa.sql
-- ==================================================

-- Create product_qa table
CREATE TABLE IF NOT EXISTS public.product_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Enable RLS
ALTER TABLE public.product_qa ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view QAs
CREATE POLICY "Anyone can view product QAs"
  ON public.product_qa FOR SELECT
  USING (true);

-- Allow authenticated users to insert questions
CREATE POLICY "Authenticated users can ask questions"
  ON public.product_qa FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow admins to manage all QAs (answer them, delete them)
CREATE POLICY "Admins can manage all QAs"
  ON public.product_qa FOR ALL
  USING (public.is_admin(auth.uid()));


-- ==================================================
-- MIGRATION: 20260701000000_storefront_cms_foundation.sql
-- ==================================================

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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

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

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_page_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published stores"
  ON public.stores FOR SELECT
  USING (is_published = true OR owner_id = auth.uid());

CREATE POLICY "Store owners can manage stores"
  ON public.stores FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Anyone can view themes for published stores"
  ON public.store_themes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_themes.store_id
        AND (stores.is_published = true OR stores.owner_id = auth.uid())
    )
  );

CREATE POLICY "Store owners can manage themes"
  ON public.store_themes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_themes.store_id
        AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_themes.store_id
        AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view pages for published stores"
  ON public.store_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_pages.store_id
        AND (stores.is_published = true OR stores.owner_id = auth.uid())
    )
  );

CREATE POLICY "Store owners can manage pages"
  ON public.store_pages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_pages.store_id
        AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_pages.store_id
        AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view blocks for published stores"
  ON public.store_page_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_blocks.store_id
        AND (stores.is_published = true OR stores.owner_id = auth.uid())
    )
  );

CREATE POLICY "Store owners can manage blocks"
  ON public.store_page_blocks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_blocks.store_id
        AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_blocks.store_id
        AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can view revisions"
  ON public.store_page_revisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_revisions.store_id
        AND stores.owner_id = auth.uid()
    )
  );

CREATE POLICY "Store owners can manage revisions"
  ON public.store_page_revisions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_revisions.store_id
        AND stores.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_revisions.store_id
        AND stores.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_store_pages_store_id ON public.store_pages(store_id);
CREATE INDEX IF NOT EXISTS idx_store_page_blocks_page_id ON public.store_page_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_store_page_blocks_store_id ON public.store_page_blocks(store_id);
CREATE INDEX IF NOT EXISTS idx_store_page_revisions_page_id ON public.store_page_revisions(page_id);

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_themes_updated_at
  BEFORE UPDATE ON public.store_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_pages_updated_at
  BEFORE UPDATE ON public.store_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_page_blocks_updated_at
  BEFORE UPDATE ON public.store_page_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ==================================================
-- MIGRATION: 20260701000001_storefront_admin_policies.sql
-- ==================================================

DROP POLICY IF EXISTS "Store owners can manage stores" ON public.stores;
CREATE POLICY "Store owners can manage stores"
  ON public.stores FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Store owners can manage themes" ON public.store_themes;
CREATE POLICY "Store owners can manage themes"
  ON public.store_themes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_themes.store_id
        AND (stores.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_themes.store_id
        AND (stores.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store owners can manage pages" ON public.store_pages;
CREATE POLICY "Store owners can manage pages"
  ON public.store_pages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_pages.store_id
        AND (stores.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_pages.store_id
        AND (stores.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store owners can manage blocks" ON public.store_page_blocks;
CREATE POLICY "Store owners can manage blocks"
  ON public.store_page_blocks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_blocks.store_id
        AND (stores.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_blocks.store_id
        AND (stores.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Store owners can manage revisions" ON public.store_page_revisions;
CREATE POLICY "Store owners can manage revisions"
  ON public.store_page_revisions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_revisions.store_id
        AND (stores.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_page_revisions.store_id
        AND (stores.owner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );


-- ==================================================
-- MIGRATION: 20260702000000_cms_engine_multi_tenant.sql
-- ==================================================

-- Commerce Engine CMS multi-tenant foundation.
-- This migration keeps the earlier single-store tables working while adding the
-- ownership, plan, tenant settings, and store-scoped commerce data needed for a CMS engine.

DO $$
BEGIN
  CREATE TYPE public.store_member_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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

INSERT INTO public.store_subscriptions (store_id, plan_id, status)
VALUES ('00000000-0000-4000-8000-000000000001', 'starter', 'active')
ON CONFLICT (store_id) DO UPDATE
SET plan_id = EXCLUDED.plan_id, status = EXCLUDED.status, updated_at = now();

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

UPDATE public.site_settings SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.products SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.orders SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.cart_items SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.coupon_codes SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.product_categories SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.product_types SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.product_reviews SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.product_qa SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.stock_notifications SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.contact_messages SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.customer_addresses SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;

ALTER TABLE IF EXISTS public.site_settings DROP CONSTRAINT IF EXISTS site_settings_key_key;
DROP INDEX IF EXISTS public.site_settings_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_settings_store_key
  ON public.site_settings(store_id, key)
  WHERE store_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_settings_global_key
  ON public.site_settings(key)
  WHERE store_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'site_settings_store_key_unique'
  ) THEN
    ALTER TABLE public.site_settings
      ADD CONSTRAINT site_settings_store_key_unique UNIQUE (store_id, key);
  END IF;
END $$;

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

ALTER TABLE public.cms_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;
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

DROP POLICY IF EXISTS "Store members can view memberships" ON public.store_memberships;
CREATE POLICY "Store members can view memberships"
  ON public.store_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_manage_store(store_id, auth.uid())
  );

DROP POLICY IF EXISTS "Store owners can manage memberships" ON public.store_memberships;
CREATE POLICY "Store owners can manage memberships"
  ON public.store_memberships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_memberships owner_membership
      WHERE owner_membership.store_id = store_memberships.store_id
        AND owner_membership.user_id = auth.uid()
        AND owner_membership.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_memberships owner_membership
      WHERE owner_membership.store_id = store_memberships.store_id
        AND owner_membership.user_id = auth.uid()
        AND owner_membership.role IN ('owner', 'admin')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Store managers can view subscriptions" ON public.store_subscriptions;
CREATE POLICY "Store managers can view subscriptions"
  ON public.store_subscriptions FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Platform admins can manage subscriptions" ON public.store_subscriptions;
CREATE POLICY "Platform admins can manage subscriptions"
  ON public.store_subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can create CMS signup leads" ON public.cms_signup_leads;
CREATE POLICY "Anyone can create CMS signup leads"
  ON public.cms_signup_leads FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Platform admins can manage CMS signup leads" ON public.cms_signup_leads;
CREATE POLICY "Platform admins can manage CMS signup leads"
  ON public.cms_signup_leads FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_cms_plans_updated_at ON public.cms_plans;
CREATE TRIGGER update_cms_plans_updated_at
  BEFORE UPDATE ON public.cms_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_memberships_updated_at ON public.store_memberships;
CREATE TRIGGER update_store_memberships_updated_at
  BEFORE UPDATE ON public.store_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_subscriptions_updated_at ON public.store_subscriptions;
CREATE TRIGGER update_store_subscriptions_updated_at
  BEFORE UPDATE ON public.store_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ==================================================
-- MIGRATION: 20260702000001_store_staff_invites.sql
-- ==================================================

CREATE TABLE IF NOT EXISTS public.store_staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  role public.store_member_role NOT NULL DEFAULT 'editor',
  email text,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_staff_invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_store_staff_invites_store_id ON public.store_staff_invites(store_id);
CREATE INDEX IF NOT EXISTS idx_store_staff_invites_email ON public.store_staff_invites(email);

INSERT INTO public.store_memberships (store_id, user_id, role)
SELECT stores.id, stores.owner_id, 'owner'::public.store_member_role
FROM public.stores
WHERE stores.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.store_memberships
    WHERE store_memberships.store_id = stores.id
      AND store_memberships.user_id = stores.owner_id
  );

DROP POLICY IF EXISTS "Store managers can view staff invites" ON public.store_staff_invites;
CREATE POLICY "Store managers can view staff invites"
  ON public.store_staff_invites FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store managers can manage staff invites" ON public.store_staff_invites;
CREATE POLICY "Store managers can manage staff invites"
  ON public.store_staff_invites FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));


-- ==================================================
-- MIGRATION: 20260702000002_tenant_rls_cleanup.sql
-- ==================================================

-- Align legacy commerce tables with the CMS multi-tenant model.
-- This keeps public storefront reads working while moving merchant/admin access
-- to store-scoped checks and making customer writes include a store context.

CREATE OR REPLACE FUNCTION public.validate_coupon(
  _code text,
  _order_total integer,
  _store_id uuid DEFAULT NULL
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
    AND (_store_id IS NULL OR store_id = _store_id)
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
  _store_id uuid DEFAULT NULL
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
    AND (_store_id IS NULL OR store_id = _store_id)
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

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Only main admin can delete products" ON public.products;

CREATE POLICY "Public can view store products"
  ON public.products FOR SELECT
  USING (store_id IS NOT NULL);

CREATE POLICY "Store staff can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

CREATE POLICY "Store staff can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

CREATE POLICY "Store staff can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Main admin can manage site settings" ON public.site_settings;

CREATE POLICY "Public can view site settings"
  ON public.site_settings FOR SELECT
  USING (store_id IS NOT NULL);

CREATE POLICY "Store staff can manage site settings"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

CREATE POLICY "Customers can create store orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    store_id IS NOT NULL
    AND (
      user_id IS NULL
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can view own store orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND store_id IS NOT NULL
  );

CREATE POLICY "Store staff can view all store orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

CREATE POLICY "Store staff can update store orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Users can manage own addresses" ON public.customer_addresses;

CREATE POLICY "Customers can manage own store addresses"
  ON public.customer_addresses FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND store_id IS NOT NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    AND store_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Anyone can create contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;

CREATE POLICY "Anyone can create store contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (store_id IS NOT NULL);

CREATE POLICY "Store staff can view store contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()));

CREATE POLICY "Store staff can update store contact messages"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;

CREATE POLICY "Customers can manage own store cart"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND store_id IS NOT NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    AND store_id IS NOT NULL
  );

DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupon_codes;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupon_codes;

CREATE POLICY "Public can view active store coupons"
  ON public.coupon_codes FOR SELECT
  USING (is_active = true AND store_id IS NOT NULL);

CREATE POLICY "Store staff can manage coupons"
  ON public.coupon_codes FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Authenticated users can insert own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Admins can update reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.product_reviews;

CREATE POLICY "Public can view approved store reviews"
  ON public.product_reviews FOR SELECT
  USING (
    status = 'approved'
    AND store_id IS NOT NULL
  );

CREATE POLICY "Customers can view own store reviews"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND store_id IS NOT NULL
  );

CREATE POLICY "Customers can insert own store reviews"
  ON public.product_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND store_id IS NOT NULL
  );

CREATE POLICY "Store staff can moderate store reviews"
  ON public.product_reviews FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view categories" ON public.product_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;

CREATE POLICY "Public can view store categories"
  ON public.product_categories FOR SELECT
  USING (store_id IS NOT NULL);

CREATE POLICY "Store staff can manage categories"
  ON public.product_categories FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view types" ON public.product_types;
DROP POLICY IF EXISTS "Admins can manage types" ON public.product_types;

CREATE POLICY "Public can view store types"
  ON public.product_types FOR SELECT
  USING (store_id IS NOT NULL);

CREATE POLICY "Store staff can manage types"
  ON public.product_types FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can insert stock notifications" ON public.stock_notifications;
DROP POLICY IF EXISTS "Users can view own stock notifications" ON public.stock_notifications;
DROP POLICY IF EXISTS "Admins can manage all stock notifications" ON public.stock_notifications;

CREATE POLICY "Anyone can insert store stock notifications"
  ON public.stock_notifications FOR INSERT
  WITH CHECK (store_id IS NOT NULL);

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

CREATE POLICY "Store staff can manage stock notifications"
  ON public.stock_notifications FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Anyone can view product QAs" ON public.product_qa;
DROP POLICY IF EXISTS "Authenticated users can ask questions" ON public.product_qa;
DROP POLICY IF EXISTS "Admins can manage all QAs" ON public.product_qa;

CREATE POLICY "Public can view store product QAs"
  ON public.product_qa FOR SELECT
  USING (store_id IS NOT NULL);

CREATE POLICY "Authenticated users can ask store questions"
  ON public.product_qa FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
    AND store_id IS NOT NULL
  );

CREATE POLICY "Store staff can manage store product QAs"
  ON public.product_qa FOR ALL
  TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()));


-- ==================================================
-- MIGRATION: 20260702000003_platform_control_plane.sql
-- ==================================================

-- Platform CMS control plane: normalized feature entitlements and store lifecycle tracking.

CREATE TABLE IF NOT EXISTS public.cms_features (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  default_visible boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cms_plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL REFERENCES public.cms_plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.cms_features(key) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.store_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.cms_features(key) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.user_email_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email text NOT NULL,
  feature_key text NOT NULL REFERENCES public.cms_features(key) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_feature_overrides_unique
  ON public.user_email_feature_overrides(normalized_email, feature_key, COALESCE(store_id, '00000000-0000-0000-0000-000000000000'::uuid));

DO $$
BEGIN
  CREATE TYPE public.store_lifecycle_status AS ENUM ('active', 'at_risk', 'reminded', 'archived', 'pending_delete', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.store_lifecycle_states (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  lifecycle_status public.store_lifecycle_status NOT NULL DEFAULT 'active',
  status_reason text,
  last_activity_at timestamptz,
  last_storefront_activity_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  reminder_1_sent_at timestamptz,
  reminder_2_sent_at timestamptz,
  reminder_3_sent_at timestamptz,
  last_reminder_at timestamptz,
  next_reminder_at timestamptz,
  archived_at timestamptz,
  scheduled_delete_at timestamptz,
  deleted_at timestamptz,
  manual_hold boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_lifecycle_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view CMS features" ON public.cms_features;
CREATE POLICY "Anyone can view CMS features"
  ON public.cms_features FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Platform admins can manage CMS features" ON public.cms_features;
CREATE POLICY "Platform admins can manage CMS features"
  ON public.cms_features FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can view CMS plan features" ON public.cms_plan_features;
CREATE POLICY "Anyone can view CMS plan features"
  ON public.cms_plan_features FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Platform admins can manage CMS plan features" ON public.cms_plan_features;
CREATE POLICY "Platform admins can manage CMS plan features"
  ON public.cms_plan_features FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Platform admins can manage store feature overrides" ON public.store_feature_overrides;
CREATE POLICY "Platform admins can manage store feature overrides"
  ON public.store_feature_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store admins can view store feature overrides" ON public.store_feature_overrides;
CREATE POLICY "Store admins can view store feature overrides"
  ON public.store_feature_overrides FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.can_manage_store(store_id, auth.uid())
  );

DROP POLICY IF EXISTS "Platform admins can manage user email feature overrides" ON public.user_email_feature_overrides;
CREATE POLICY "Platform admins can manage user email feature overrides"
  ON public.user_email_feature_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Platform admins can manage store lifecycle states" ON public.store_lifecycle_states;
CREATE POLICY "Platform admins can manage store lifecycle states"
  ON public.store_lifecycle_states FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store managers can view lifecycle state" ON public.store_lifecycle_states;
CREATE POLICY "Store managers can view lifecycle state"
  ON public.store_lifecycle_states FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.can_manage_store(store_id, auth.uid())
  );

DROP POLICY IF EXISTS "Platform admins can manage lifecycle events" ON public.store_lifecycle_events;
CREATE POLICY "Platform admins can manage lifecycle events"
  ON public.store_lifecycle_events FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.cms_features (key, name, description, category, default_visible, is_active)
VALUES
  ('cms_pages', 'CMS Pages', 'Multi-page storefront builder and homepage blocks.', 'content', true, true),
  ('launch_templates', 'Launch Templates', 'Business-type templates and onboarding presets.', 'content', true, true),
  ('media_library', 'Media Library', 'Reusable uploaded media across onboarding and CMS.', 'content', true, true),
  ('backup_import', 'Backup & Import', 'Store backup, export, restore, and portability tooling.', 'operations', true, true),
  ('custom_domains', 'Custom Domains', 'Custom domain support for storefronts.', 'growth', true, true),
  ('staff_management', 'Staff Management', 'Store staff roles, invitations, and seat management.', 'operations', true, true),
  ('theme_presets', 'Theme Presets', 'Theme selection, presets, and advanced styling controls.', 'design', true, true),
  ('advanced_analytics', 'Advanced Analytics', 'Richer merchant reporting and trend dashboards.', 'analytics', true, true),
  ('automations', 'Automations', 'Lifecycle jobs, reminders, and scheduled operational tasks.', 'operations', true, true),
  ('scheduled_backups', 'Scheduled Backups', 'Automatic recurring backup generation.', 'operations', true, true),
  ('lifecycle_recovery', 'Lifecycle Recovery', 'Archived store recovery and deletion rescue controls.', 'operations', false, true)
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_visible = EXCLUDED.default_visible,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.cms_plan_features (plan_id, feature_key, enabled)
VALUES
  ('starter', 'cms_pages', true),
  ('starter', 'launch_templates', true),
  ('starter', 'media_library', true),
  ('starter', 'backup_import', false),
  ('starter', 'custom_domains', false),
  ('starter', 'staff_management', false),
  ('starter', 'theme_presets', true),
  ('starter', 'advanced_analytics', false),
  ('starter', 'automations', false),
  ('starter', 'scheduled_backups', false),
  ('starter', 'lifecycle_recovery', false),
  ('growth', 'cms_pages', true),
  ('growth', 'launch_templates', true),
  ('growth', 'media_library', true),
  ('growth', 'backup_import', true),
  ('growth', 'custom_domains', false),
  ('growth', 'staff_management', true),
  ('growth', 'theme_presets', true),
  ('growth', 'advanced_analytics', true),
  ('growth', 'automations', true),
  ('growth', 'scheduled_backups', false),
  ('growth', 'lifecycle_recovery', true),
  ('scale', 'cms_pages', true),
  ('scale', 'launch_templates', true),
  ('scale', 'media_library', true),
  ('scale', 'backup_import', true),
  ('scale', 'custom_domains', true),
  ('scale', 'staff_management', true),
  ('scale', 'theme_presets', true),
  ('scale', 'advanced_analytics', true),
  ('scale', 'automations', true),
  ('scale', 'scheduled_backups', true),
  ('scale', 'lifecycle_recovery', true)
ON CONFLICT (plan_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled, updated_at = now();

INSERT INTO public.store_lifecycle_states (store_id, lifecycle_status, last_activity_at, last_storefront_activity_at)
SELECT
  id,
  CASE WHEN is_published THEN 'active'::public.store_lifecycle_status ELSE 'at_risk'::public.store_lifecycle_status END,
  updated_at,
  updated_at
FROM public.stores
ON CONFLICT (store_id) DO UPDATE
SET
  last_activity_at = COALESCE(public.store_lifecycle_states.last_activity_at, EXCLUDED.last_activity_at),
  last_storefront_activity_at = COALESCE(public.store_lifecycle_states.last_storefront_activity_at, EXCLUDED.last_storefront_activity_at),
  updated_at = now();

DROP TRIGGER IF EXISTS update_cms_features_updated_at ON public.cms_features;
CREATE TRIGGER update_cms_features_updated_at
  BEFORE UPDATE ON public.cms_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cms_plan_features_updated_at ON public.cms_plan_features;
CREATE TRIGGER update_cms_plan_features_updated_at
  BEFORE UPDATE ON public.cms_plan_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_feature_overrides_updated_at ON public.store_feature_overrides;
CREATE TRIGGER update_store_feature_overrides_updated_at
  BEFORE UPDATE ON public.store_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_email_feature_overrides_updated_at ON public.user_email_feature_overrides;
CREATE TRIGGER update_user_email_feature_overrides_updated_at
  BEFORE UPDATE ON public.user_email_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_lifecycle_states_updated_at ON public.store_lifecycle_states;
CREATE TRIGGER update_store_lifecycle_states_updated_at
  BEFORE UPDATE ON public.store_lifecycle_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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



