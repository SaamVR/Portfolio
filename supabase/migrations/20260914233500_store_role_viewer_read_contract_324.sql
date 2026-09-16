-- P1 #324 follow-up: complete the launch capability matrix for viewer reads and
-- owner/admin-only preview authority without broadening sensitive configuration.

CREATE OR REPLACE FUNCTION public.can_administer_store(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _user_id = (SELECT auth.uid())
    AND (
      public.is_store_admin(_store_id, _user_id)
      OR public.has_role(_user_id, 'admin'::public.app_role)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_store(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _user_id = (SELECT auth.uid())
    AND (
      EXISTS (
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
          AND role IN ('owner', 'admin', 'editor', 'viewer')
      )
      OR public.has_role(_user_id, 'admin'::public.app_role)
    );
$$;

REVOKE ALL ON FUNCTION public.can_administer_store(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_store(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_administer_store(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_store(uuid, uuid) TO authenticated, service_role;

-- Viewer means read-only review, not access to secret/integration/billing surfaces.
-- Catalog/content reads are therefore widened only for authenticated store members.
DROP POLICY IF EXISTS "Public and store managers can view store products" ON public.products;
CREATE POLICY "Public and store team can view store products"
  ON public.products FOR SELECT
  TO public
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = products.store_id
        AND (
          stores.is_published = true
          OR public.can_view_store(stores.id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Public and store managers can view store categories" ON public.product_categories;
CREATE POLICY "Public and store team can view store categories"
  ON public.product_categories FOR SELECT
  TO public
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = product_categories.store_id
        AND (
          stores.is_published = true
          OR public.can_view_store(stores.id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Public and store managers can view store types" ON public.product_types;
CREATE POLICY "Public and store team can view store types"
  ON public.product_types FOR SELECT
  TO public
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = product_types.store_id
        AND (
          stores.is_published = true
          OR public.can_view_store(stores.id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Store managers can view store coupons" ON public.coupon_codes;
CREATE POLICY "Store team can view store coupons"
  ON public.coupon_codes FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS "Anyone can view themes for published stores" ON public.store_themes;
CREATE POLICY "Public and store team can view themes"
  ON public.store_themes FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.stores
      WHERE stores.id = store_themes.store_id
        AND (
          stores.is_published = true
          OR public.can_view_store(stores.id, auth.uid())
        )
    )
  );

-- Viewers may review merchant-authored storefront content/drafts but cannot mutate it.
DROP POLICY IF EXISTS "Store managers can read storefront drafts" ON public.storefront_drafts;
CREATE POLICY "Store team can read storefront drafts"
  ON public.storefront_drafts FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, (SELECT auth.uid())));

CREATE POLICY "Store team can view pages"
  ON public.store_pages FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, auth.uid()));

CREATE POLICY "Store team can view blocks"
  ON public.store_page_blocks FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, auth.uid()));

DROP POLICY IF EXISTS "Store owners can view revisions" ON public.store_page_revisions;
CREATE POLICY "Store team can view revisions"
  ON public.store_page_revisions FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, auth.uid()));

CREATE POLICY "Store team can view blog posts"
  ON public.blog_posts FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, auth.uid()));

CREATE POLICY "Store team can view product reviews"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, auth.uid()));

CREATE POLICY "Store team can view product QAs"
  ON public.product_qa FOR SELECT
  TO authenticated
  USING (public.can_view_store(store_id, auth.uid()));

-- Viewer can inspect presentation settings but not authority-bearing payment,
-- delivery, onboarding, storefront profile, support integration, or seed metadata.
DROP POLICY IF EXISTS "Store team can view content site settings" ON public.site_settings;
CREATE POLICY "Store team can view content site settings"
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (
    public.can_view_store(store_id, auth.uid())
    AND key = ANY (ARRAY[
      'about_page',
      'announcement_bar',
      'blog',
      'brand_settings',
      'categories_custom_data',
      'contact_page',
      'countdown_timer',
      'exit_intent',
      'fallback_category_image_url',
      'fallback_product_image_url',
      'faq_entries',
      'footer',
      'hero_section',
      'home_categories',
      'home_featured',
      'homepage_section_visibility',
      'logo_url',
      'media_library',
      'navigation',
      'promo_banner',
      'theme_customization',
      'upsells'
    ]::text[])
  );

-- Preview tokens disclose unpublished storefronts and are therefore admin-only.
DROP POLICY IF EXISTS "Store managers can create preview tokens" ON public.store_preview_tokens;
DROP POLICY IF EXISTS "Store managers can delete preview tokens" ON public.store_preview_tokens;
DROP POLICY IF EXISTS "Store managers can read preview tokens" ON public.store_preview_tokens;

CREATE POLICY "Store admins can create preview tokens"
  ON public.store_preview_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.can_administer_store(store_id, (SELECT auth.uid()))
  );

CREATE POLICY "Store admins can delete preview tokens"
  ON public.store_preview_tokens FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND public.can_administer_store(store_id, (SELECT auth.uid()))
  );

CREATE POLICY "Store admins can read preview tokens"
  ON public.store_preview_tokens FOR SELECT
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND public.can_administer_store(store_id, (SELECT auth.uid()))
  );
