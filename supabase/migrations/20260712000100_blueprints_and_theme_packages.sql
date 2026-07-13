CREATE TABLE IF NOT EXISTS public.store_blueprints (
  id text PRIMARY KEY,
  legacy_template_id text,
  name text NOT NULL,
  short_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  business_family text NOT NULL DEFAULT 'commerce',
  catalog_mode text NOT NULL DEFAULT 'multi_product',
  group_name text NOT NULL DEFAULT 'General',
  recommended_page_set jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_block_set jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  store_description text NOT NULL DEFAULT '',
  hero_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  onboarding_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_site_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.page_blueprints (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  business_family text NOT NULL DEFAULT 'commerce',
  catalog_modes jsonb NOT NULL DEFAULT '[]'::jsonb,
  page_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theme_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  preview_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_type text NOT NULL DEFAULT 'system',
  version integer NOT NULL DEFAULT 1,
  compatibility_version integer NOT NULL DEFAULT 1,
  preset_id text NOT NULL DEFAULT 'default',
  mode text NOT NULL DEFAULT 'dark' CHECK (mode IN ('light', 'dark')),
  tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  component_recipes jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_css text,
  owner_store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_business_profiles (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  blueprint_id text,
  blueprint_version integer,
  business_family text NOT NULL DEFAULT 'commerce',
  catalog_mode text NOT NULL DEFAULT 'multi_product',
  enabled_modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_themes
  ADD COLUMN IF NOT EXISTS theme_package_id uuid REFERENCES public.theme_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS theme_package_version integer,
  ADD COLUMN IF NOT EXISTS overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS resolved_tokens jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.store_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_business_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active store blueprints" ON public.store_blueprints;
CREATE POLICY "Anyone can read active store blueprints"
  ON public.store_blueprints FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage store blueprints" ON public.store_blueprints;
CREATE POLICY "Admins can manage store blueprints"
  ON public.store_blueprints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read active page blueprints" ON public.page_blueprints;
CREATE POLICY "Anyone can read active page blueprints"
  ON public.page_blueprints FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage page blueprints" ON public.page_blueprints;
CREATE POLICY "Admins can manage page blueprints"
  ON public.page_blueprints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Shared or owned theme packages are readable" ON public.theme_packages;
CREATE POLICY "Shared or owned theme packages are readable"
  ON public.theme_packages FOR SELECT
  USING (
    (
      source_type IN ('system', 'admin_shared')
      AND is_active = true
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.can_manage_store(owner_store_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage shared theme packages" ON public.theme_packages;
CREATE POLICY "Admins can manage shared theme packages"
  ON public.theme_packages FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      source_type = 'merchant_private'
      AND owner_store_id IS NOT NULL
      AND public.can_manage_store(owner_store_id, auth.uid())
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      source_type = 'merchant_private'
      AND owner_store_id IS NOT NULL
      AND public.can_manage_store(owner_store_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Store owners can read business profiles" ON public.store_business_profiles;
CREATE POLICY "Store owners can read business profiles"
  ON public.store_business_profiles FOR SELECT TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store owners can manage business profiles" ON public.store_business_profiles;
CREATE POLICY "Store owners can manage business profiles"
  ON public.store_business_profiles FOR ALL TO authenticated
  USING (public.can_manage_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.can_manage_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.store_blueprints (
  id,
  legacy_template_id,
  name,
  short_name,
  description,
  business_family,
  catalog_mode,
  group_name,
  recommended_page_set,
  recommended_block_set,
  default_theme,
  store_description,
  hero_payload,
  required_capabilities,
  onboarding_schema,
  default_site_settings
)
VALUES
  (
    'clothing',
    'clothing',
    'Fashion Catalog',
    'Fashion',
    'A modern apparel storefront for drops, collections, and frequent launches.',
    'commerce',
    'multi_product',
    'Clothing',
    '["home","policy"]'::jsonb,
    '["hero","promo-banner","category-showcase","featured-products","faq-accordion","social-feed"]'::jsonb,
    '{"presetId":"default","mode":"dark","headingFont":"''Outfit'', sans-serif","bodyFont":"''Plus Jakarta Sans'', sans-serif","borderRadius":"0.75rem","customCssVars":{}}'::jsonb,
    'Premium clothing, curated drops, and everyday essentials with fast local delivery.',
    '{"tagline":"New Season","title":"Wear Your","highlight":"Identity","subtitle":"Launch your clothing store with curated drops, premium product sections, and mobile-first checkout."}'::jsonb,
    '["catalog","cart","checkout","promotions"]'::jsonb,
    '{"steps":[{"id":"blueprint","title":"Blueprint","description":"Pick the site style and launch pattern"},{"id":"brand","title":"Brand","description":"Name, logo, slug, and brand summary"},{"id":"content","title":"Content","description":"Front-page hero copy and media"},{"id":"catalog","title":"Catalog","description":"Choose how products and buying work"},{"id":"theme","title":"Theme","description":"Pick a design package and visual defaults"},{"id":"payments","title":"Payments","description":"Configure checkout and conversion options"},{"id":"launch","title":"Launch","description":"Save, publish, and share"}]}'::jsonb,
    '{"storefront_profile":{"product_visibility":"catalog","checkout_mode":"standard"}}'::jsonb
  ),
  (
    'food',
    'food',
    'Food & Menu',
    'Food',
    'A menu-style storefront for daily specials, meal boxes, bakery items, and local ordering.',
    'commerce',
    'menu',
    'Food / Menu',
    '["home","about-kitchen"]'::jsonb,
    '["hero","promo-banner","featured-products","rich-text","faq-accordion"]'::jsonb,
    '{"presetId":"warm-earth","mode":"light","headingFont":"''Outfit'', sans-serif","bodyFont":"''Plus Jakarta Sans'', sans-serif","borderRadius":"1rem","customCssVars":{}}'::jsonb,
    'Fresh food, meal boxes, bakery items, and local delivery made simple.',
    '{"tagline":"Fresh Today","title":"Homemade","highlight":"Goodness","subtitle":"Sell meals, bakery items, and daily specials with a simple storefront built for local orders."}'::jsonb,
    '["catalog","cart","local_delivery"]'::jsonb,
    '{"steps":[{"id":"blueprint","title":"Blueprint","description":"Pick the site style and launch pattern"},{"id":"brand","title":"Brand","description":"Name, logo, slug, and brand summary"},{"id":"content","title":"Content","description":"Front-page hero copy and media"},{"id":"catalog","title":"Catalog","description":"Choose how products and buying work"},{"id":"theme","title":"Theme","description":"Pick a design package and visual defaults"},{"id":"payments","title":"Payments","description":"Configure checkout and conversion options"},{"id":"launch","title":"Launch","description":"Save, publish, and share"}]}'::jsonb,
    '{"storefront_profile":{"product_visibility":"menu","checkout_mode":"standard"}}'::jsonb
  ),
  (
    'general-catalog',
    'general',
    'General Catalog',
    'Catalog',
    'A flexible default for mixed-product stores that need a clean starting point.',
    'commerce',
    'multi_product',
    'General Catalog',
    '["home","about","policy"]'::jsonb,
    '["hero","featured-products","rich-text","faq-accordion","trust-badges"]'::jsonb,
    '{"presetId":"ocean-teal","mode":"dark","headingFont":"''Outfit'', sans-serif","bodyFont":"''Inter'', sans-serif","borderRadius":"0.75rem","customCssVars":{}}'::jsonb,
    'A flexible storefront for products, bundles, promotions, and everyday ecommerce operations.',
    '{"tagline":"Built to Adapt","title":"Create a Store That","highlight":"Fits You","subtitle":"Start from a neutral catalog structure and make the storefront yours without category-biased defaults."}'::jsonb,
    '["catalog","cart","checkout"]'::jsonb,
    '{"steps":[{"id":"blueprint","title":"Blueprint","description":"Pick the site style and launch pattern"},{"id":"brand","title":"Brand","description":"Name, logo, slug, and brand summary"},{"id":"content","title":"Content","description":"Front-page hero copy and media"},{"id":"catalog","title":"Catalog","description":"Choose how products and buying work"},{"id":"theme","title":"Theme","description":"Pick a design package and visual defaults"},{"id":"payments","title":"Payments","description":"Configure checkout and conversion options"},{"id":"launch","title":"Launch","description":"Save, publish, and share"}]}'::jsonb,
    '{"storefront_profile":{"product_visibility":"catalog","checkout_mode":"standard"}}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
