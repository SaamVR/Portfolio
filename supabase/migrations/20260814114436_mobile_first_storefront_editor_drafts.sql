-- Private cross-device editor drafts, immutable releases, responsive block metadata,
-- and registry variant merchandising for the mobile-first storefront editor.

ALTER TABLE public.store_page_blocks
  ADD COLUMN IF NOT EXISTS responsive_config jsonb NOT NULL DEFAULT '{"hiddenOn":[]}'::jsonb;

ALTER TABLE public.store_page_blocks
  DROP CONSTRAINT IF EXISTS store_page_blocks_responsive_config_object;

ALTER TABLE public.store_page_blocks
  ADD CONSTRAINT store_page_blocks_responsive_config_object
  CHECK (jsonb_typeof(responsive_config) = 'object');

-- One-time compatibility migration: instance visibility becomes canonical.
UPDATE public.store_page_blocks block
SET is_visible = (setting.value->>block.block_type)::boolean,
    updated_at = now()
FROM public.store_pages page,
     public.site_settings setting
WHERE page.id = block.page_id
  AND page.store_id = block.store_id
  AND page.is_homepage = true
  AND setting.store_id = block.store_id
  AND setting.key = 'homepage_section_visibility'
  AND jsonb_typeof(setting.value) = 'object'
  AND setting.value ? block.block_type
  AND jsonb_typeof(setting.value->block.block_type) = 'boolean';

ALTER TABLE public.block_registry_entries
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'utility',
  ADD COLUMN IF NOT EXISTS icon_key text,
  ADD COLUMN IF NOT EXISTS allowed_page_types jsonb NOT NULL DEFAULT '["homepage","catalog","product","checkout","contact","about","custom"]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_core boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_singleton boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_removable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_duplicable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_hideable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_responsive boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.block_registry_variants (
  block_type text NOT NULL REFERENCES public.block_registry_entries(block_type) ON DELETE CASCADE,
  variant_id text NOT NULL,
  label text NOT NULL,
  guidance text NOT NULL DEFAULT '',
  preview_summary text NOT NULL DEFAULT '',
  preview_asset_url text,
  default_props jsonb NOT NULL DEFAULT '{}'::jsonb,
  supported_template_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  supported_business_families jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_mobile_ready boolean NOT NULL DEFAULT true,
  is_recommended boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (block_type, variant_id),
  CONSTRAINT block_registry_variants_default_props_object CHECK (jsonb_typeof(default_props) = 'object')
);

CREATE TABLE IF NOT EXISTS public.storefront_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  release_number bigint NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL,
  label text NOT NULL DEFAULT 'Published storefront',
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  restored_from_release_id uuid REFERENCES public.storefront_releases(id) ON DELETE SET NULL,
  UNIQUE (store_id, release_number),
  CONSTRAINT storefront_releases_snapshot_object CHECK (jsonb_typeof(snapshot) = 'object')
);

CREATE TABLE IF NOT EXISTS public.storefront_drafts (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL,
  version bigint NOT NULL DEFAULT 1,
  base_release_id uuid REFERENCES public.storefront_releases(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT storefront_drafts_snapshot_object CHECK (jsonb_typeof(snapshot) = 'object')
);

CREATE INDEX IF NOT EXISTS storefront_releases_store_published_idx
  ON public.storefront_releases(store_id, published_at DESC);

CREATE INDEX IF NOT EXISTS storefront_drafts_updated_by_idx
  ON public.storefront_drafts(updated_by, updated_at DESC);

CREATE INDEX IF NOT EXISTS block_registry_variants_active_idx
  ON public.block_registry_variants(block_type, is_active, sort_order);

ALTER TABLE public.block_registry_variants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.storefront_drafts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.storefront_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active block registry variants" ON public.block_registry_variants;

CREATE POLICY "Anyone can read active block registry variants"
  ON public.block_registry_variants FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Platform admins can manage block registry variants" ON public.block_registry_variants;

CREATE POLICY "Platform admins can manage block registry variants"
  ON public.block_registry_variants FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Store managers can read storefront drafts" ON public.storefront_drafts;

CREATE POLICY "Store managers can read storefront drafts"
  ON public.storefront_drafts FOR SELECT TO authenticated
  USING (public.can_manage_store(store_id, (select auth.uid())));

DROP POLICY IF EXISTS "Store managers can create storefront drafts" ON public.storefront_drafts;

CREATE POLICY "Store managers can create storefront drafts"
  ON public.storefront_drafts FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_store(store_id, (select auth.uid())) AND updated_by = (select auth.uid()));

DROP POLICY IF EXISTS "Store managers can update storefront drafts" ON public.storefront_drafts;

CREATE POLICY "Store managers can update storefront drafts"
  ON public.storefront_drafts FOR UPDATE TO authenticated
  USING (public.can_manage_store(store_id, (select auth.uid())))
  WITH CHECK (public.can_manage_store(store_id, (select auth.uid())) AND updated_by = (select auth.uid()));

DROP POLICY IF EXISTS "Store managers can delete storefront drafts" ON public.storefront_drafts;

CREATE POLICY "Store managers can delete storefront drafts"
  ON public.storefront_drafts FOR DELETE TO authenticated
  USING (public.can_manage_store(store_id, (select auth.uid())));

DROP POLICY IF EXISTS "Store managers can read storefront releases" ON public.storefront_releases;

CREATE POLICY "Store managers can read storefront releases"
  ON public.storefront_releases FOR SELECT TO authenticated
  USING (public.can_manage_store(store_id, (select auth.uid())));

DROP POLICY IF EXISTS "Store managers can create storefront releases" ON public.storefront_releases;

CREATE POLICY "Store managers can create storefront releases"
  ON public.storefront_releases FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_store(store_id, (select auth.uid())) AND published_by = (select auth.uid()));

GRANT SELECT ON public.block_registry_variants TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.block_registry_variants TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.storefront_drafts TO authenticated;

GRANT SELECT, INSERT ON public.storefront_releases TO authenticated;

GRANT ALL ON public.block_registry_variants, public.storefront_drafts, public.storefront_releases TO service_role;

CREATE OR REPLACE FUNCTION public.save_storefront_draft(
  p_store_id uuid,
  p_snapshot jsonb,
  p_expected_version bigint DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_current public.storefront_drafts%ROWTYPE;
BEGIN
  IF (select auth.uid()) IS NULL OR NOT public.can_manage_store(p_store_id, (select auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to edit this storefront';
  END IF;
  IF jsonb_typeof(p_snapshot) <> 'object'
    OR p_snapshot->>'storeId' IS DISTINCT FROM p_store_id::text
    OR jsonb_typeof(p_snapshot->'store') <> 'object'
    OR jsonb_typeof(p_snapshot->'store'->'pages') <> 'array' THEN
    RAISE EXCEPTION 'Invalid storefront draft snapshot';
  END IF;

  SELECT * INTO v_current
  FROM public.storefront_drafts
  WHERE store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_expected_version <> 0 THEN
      RETURN jsonb_build_object('ok', false, 'conflict', true, 'version', 0);
    END IF;
    INSERT INTO public.storefront_drafts(store_id, schema_version, snapshot, version, status, updated_by)
    VALUES (p_store_id, COALESCE((p_snapshot->>'schemaVersion')::integer, 1), p_snapshot, 1, 'draft', (select auth.uid()))
    RETURNING * INTO v_current;
  ELSE
    IF v_current.version <> p_expected_version THEN
      RETURN jsonb_build_object('ok', false, 'conflict', true, 'version', v_current.version, 'updatedAt', v_current.updated_at);
    END IF;
    UPDATE public.storefront_drafts
    SET snapshot = p_snapshot,
        schema_version = COALESCE((p_snapshot->>'schemaVersion')::integer, schema_version),
        version = version + 1,
        status = 'draft',
        updated_by = (select auth.uid()),
        updated_at = now()
    WHERE store_id = p_store_id
    RETURNING * INTO v_current;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'conflict', false,
    'version', v_current.version,
    'updatedAt', v_current.updated_at,
    'baseReleaseId', v_current.base_release_id,
    'status', v_current.status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_storefront_draft(
  p_store_id uuid,
  p_expected_version bigint,
  p_label text DEFAULT 'Published storefront'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_draft public.storefront_drafts%ROWTYPE;
  v_store jsonb;
  v_theme jsonb;
  v_page jsonb;
  v_block jsonb;
  v_release_id uuid;
  v_release_number bigint;
  v_homepage_count integer;
  v_visible_hero_count integer;
  v_setting record;
BEGIN
  IF (select auth.uid()) IS NULL OR NOT public.can_manage_store(p_store_id, (select auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to publish this storefront';
  END IF;

  PERFORM 1 FROM public.stores WHERE id = p_store_id FOR UPDATE;
  SELECT * INTO v_draft
  FROM public.storefront_drafts
  WHERE store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Storefront draft not found';
  END IF;
  IF v_draft.version <> p_expected_version THEN
    RETURN jsonb_build_object('ok', false, 'conflict', true, 'version', v_draft.version);
  END IF;

  v_store := v_draft.snapshot->'store';
  v_theme := v_store->'theme';
  IF jsonb_typeof(v_store->'pages') <> 'array' OR jsonb_array_length(v_store->'pages') = 0 THEN
    RAISE EXCEPTION 'A storefront must contain at least one page';
  END IF;

  SELECT count(*) INTO v_homepage_count
  FROM jsonb_array_elements(v_store->'pages') page
  WHERE COALESCE((page->>'isHomepage')::boolean, false) = true;
  IF v_homepage_count <> 1 THEN
    RAISE EXCEPTION 'A storefront must contain exactly one homepage';
  END IF;

  SELECT count(*) INTO v_visible_hero_count
  FROM jsonb_array_elements(v_store->'pages') page,
       jsonb_array_elements(page->'blocks') block
  WHERE COALESCE((page->>'isHomepage')::boolean, false) = true
    AND block->>'type' = 'hero'
    AND COALESCE((block->>'isVisible')::boolean, (block->>'visible')::boolean, true) = true;
  IF v_visible_hero_count = 0 THEN
    RAISE EXCEPTION 'The homepage hero must remain visible';
  END IF;

  UPDATE public.stores
  SET name = COALESCE(NULLIF(v_store->>'name', ''), name),
      slug = COALESCE(NULLIF(v_store->>'slug', ''), slug),
      description = COALESCE(v_store->>'description', description),
      currency_code = COALESCE(NULLIF(v_store->>'currencyCode', ''), currency_code),
      locale = COALESCE(NULLIF(v_store->>'locale', ''), locale),
      store_type = COALESCE(NULLIF(v_draft.snapshot->>'templateId', ''), store_type),
      is_published = true,
      updated_at = now()
  WHERE id = p_store_id;

  INSERT INTO public.store_themes(
    store_id, preset_id, theme_package_id, mode, colors, typography, components,
    aesthetic, radius_scale, density_scale, effects, palette_source, palette_seed,
    schema_version, custom_css, resolved_tokens
  ) VALUES (
    p_store_id,
    COALESCE(NULLIF(v_theme->>'presetId', ''), 'default'),
    NULLIF(v_theme->>'themePackageId', '')::uuid,
    COALESCE(NULLIF(v_theme->>'mode', ''), 'light'),
    COALESCE(v_theme->'customCssVars', '{}'::jsonb),
    jsonb_build_object('headingFont', v_theme->>'headingFont', 'bodyFont', v_theme->>'bodyFont'),
    jsonb_build_object('borderRadius', v_theme->>'borderRadius', 'aesthetic', v_theme->>'aesthetic', 'effects', COALESCE(v_theme->'effects', '{}'::jsonb)),
    COALESCE(NULLIF(v_theme->>'aesthetic', ''), 'minimal'),
    COALESCE((v_theme->>'radiusScale')::numeric, 1),
    COALESCE((v_theme->>'densityScale')::numeric, 1),
    COALESCE(v_theme->'effects', '{"scrollReveals":false,"hoverEffects":true,"parallax":false,"intensity":"medium"}'::jsonb),
    NULLIF(v_theme->>'paletteSource', ''),
    NULLIF(v_theme->>'paletteSeed', ''),
    COALESCE((v_theme->>'schemaVersion')::integer, 1),
    NULLIF(v_theme->>'customCss', ''),
    '{}'::jsonb
  )
  ON CONFLICT (store_id) DO UPDATE SET
    preset_id = excluded.preset_id,
    theme_package_id = excluded.theme_package_id,
    mode = excluded.mode,
    colors = excluded.colors,
    typography = excluded.typography,
    components = excluded.components,
    aesthetic = excluded.aesthetic,
    radius_scale = excluded.radius_scale,
    density_scale = excluded.density_scale,
    effects = excluded.effects,
    palette_source = excluded.palette_source,
    palette_seed = excluded.palette_seed,
    schema_version = excluded.schema_version,
    custom_css = excluded.custom_css,
    updated_at = now();

  FOR v_page IN SELECT value FROM jsonb_array_elements(v_store->'pages') LOOP
    INSERT INTO public.store_pages(id, store_id, slug, title, seo_title, seo_description, is_homepage)
    VALUES (
      (v_page->>'id')::uuid,
      p_store_id,
      v_page->>'slug',
      v_page->>'title',
      NULLIF(v_page->>'seoTitle', ''),
      NULLIF(v_page->>'seoDescription', ''),
      COALESCE((v_page->>'isHomepage')::boolean, false)
    )
    ON CONFLICT (id) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description,
      is_homepage = excluded.is_homepage,
      updated_at = now();

    FOR v_block IN SELECT value FROM jsonb_array_elements(COALESCE(v_page->'blocks', '[]'::jsonb)) LOOP
      IF v_block->>'type' NOT IN (
        'hero', 'countdown', 'promo-banner', 'category-showcase', 'featured-products',
        'comparison', 'recommended-products', 'recently-viewed', 'rich-text', 'social-feed',
        'video-reel', 'faq-accordion', 'trust-badges', 'testimonials'
      ) THEN
        RAISE EXCEPTION 'Unknown storefront block type: %', v_block->>'type';
      END IF;
      IF v_block ? 'responsiveConfig' AND jsonb_typeof(v_block->'responsiveConfig') <> 'object' THEN
        RAISE EXCEPTION 'responsiveConfig must be an object for block %', v_block->>'id';
      END IF;
      IF v_block->'responsiveConfig' ? 'hiddenOn'
        AND jsonb_typeof(v_block->'responsiveConfig'->'hiddenOn') <> 'array' THEN
        RAISE EXCEPTION 'responsiveConfig.hiddenOn must be an array for block %', v_block->>'id';
      END IF;
      IF COALESCE(v_block->'props'->>'ctaLink', '') <> '' AND v_block->'props'->>'ctaLink' !~ '^(https?://|/)' THEN
        RAISE EXCEPTION 'Invalid CTA link for block %', v_block->>'id';
      END IF;
      IF COALESCE(v_block->'props'->>'secondaryCtaLink', '') <> '' AND v_block->'props'->>'secondaryCtaLink' !~ '^(https?://|/)' THEN
        RAISE EXCEPTION 'Invalid secondary CTA link for block %', v_block->>'id';
      END IF;
      INSERT INTO public.store_page_blocks(
        id, page_id, store_id, block_type, props, sort_order, is_visible,
        entrance_animation, hover_effect, effect_override, layout_variant,
        responsive_config, custom_html, custom_css
      ) VALUES (
        (v_block->>'id')::uuid,
        (v_page->>'id')::uuid,
        p_store_id,
        v_block->>'type',
        COALESCE(v_block->'props', '{}'::jsonb),
        COALESCE((v_block->>'sortOrder')::integer, 0),
        COALESCE((v_block->>'isVisible')::boolean, (v_block->>'visible')::boolean, true),
        NULLIF(v_block->>'entranceAnimation', ''),
        NULLIF(v_block->>'hoverEffect', ''),
        COALESCE((v_block->>'effectOverride')::boolean, false),
        NULLIF(v_block->>'layoutVariant', ''),
        COALESCE(v_block->'responsiveConfig', '{"hiddenOn":[]}'::jsonb),
        NULLIF(v_block->>'customHtml', ''),
        NULLIF(v_block->>'customCss', '')
      )
      ON CONFLICT (id) DO UPDATE SET
        page_id = excluded.page_id,
        block_type = excluded.block_type,
        props = excluded.props,
        sort_order = excluded.sort_order,
        is_visible = excluded.is_visible,
        entrance_animation = excluded.entrance_animation,
        hover_effect = excluded.hover_effect,
        effect_override = excluded.effect_override,
        layout_variant = excluded.layout_variant,
        responsive_config = excluded.responsive_config,
        custom_html = excluded.custom_html,
        custom_css = excluded.custom_css,
        updated_at = now();
    END LOOP;
  END LOOP;

  DELETE FROM public.store_page_blocks existing
  WHERE existing.store_id = p_store_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_store->'pages') page,
           jsonb_array_elements(COALESCE(page->'blocks', '[]'::jsonb)) block
      WHERE (block->>'id')::uuid = existing.id
    );

  DELETE FROM public.store_pages existing
  WHERE existing.store_id = p_store_id
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_store->'pages') page
      WHERE (page->>'id')::uuid = existing.id
    );

  -- Temporary compatibility mirror for legacy readers. Runtime block instances remain canonical.
  INSERT INTO public.site_settings(store_id, key, value)
  SELECT p_store_id,
         'homepage_section_visibility',
         COALESCE(jsonb_object_agg(
           block->>'type',
           to_jsonb(COALESCE((block->>'isVisible')::boolean, (block->>'visible')::boolean, true))
         ), '{}'::jsonb)
  FROM jsonb_array_elements(v_store->'pages') page,
       jsonb_array_elements(COALESCE(page->'blocks', '[]'::jsonb)) block
  WHERE COALESCE((page->>'isHomepage')::boolean, false) = true
  ON CONFLICT (store_id, key) DO UPDATE SET value = excluded.value, updated_at = now();

  FOR v_setting IN
    SELECT key, value
    FROM jsonb_each(COALESCE(v_draft.snapshot->'presentationSettings', '{}'::jsonb))
  LOOP
    INSERT INTO public.site_settings(store_id, key, value)
    VALUES (p_store_id, v_setting.key, v_setting.value)
    ON CONFLICT (store_id, key) DO UPDATE SET value = excluded.value, updated_at = now();
  END LOOP;

  SELECT COALESCE(max(release_number), 0) + 1 INTO v_release_number
  FROM public.storefront_releases
  WHERE store_id = p_store_id;

  INSERT INTO public.storefront_releases(
    store_id, release_number, schema_version, snapshot, label, published_by, restored_from_release_id
  ) VALUES (
    p_store_id,
    v_release_number,
    v_draft.schema_version,
    v_draft.snapshot,
    COALESCE(NULLIF(trim(p_label), ''), 'Published storefront'),
    (select auth.uid()),
    NULLIF(v_draft.snapshot->>'restoredFromReleaseId', '')::uuid
  ) RETURNING id INTO v_release_id;

  UPDATE public.storefront_drafts
  SET base_release_id = v_release_id,
      status = 'published',
      published_at = now(),
      updated_at = now()
  WHERE store_id = p_store_id;

  RETURN jsonb_build_object(
    'ok', true,
    'conflict', false,
    'releaseId', v_release_id,
    'releaseNumber', v_release_number,
    'version', v_draft.version,
    'publishedAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_storefront_draft(uuid, jsonb, bigint) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.publish_storefront_draft(uuid, bigint, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.save_storefront_draft(uuid, jsonb, bigint) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.publish_storefront_draft(uuid, bigint, text) TO authenticated, service_role;

COMMENT ON TABLE public.storefront_drafts IS 'Private, optimistic-concurrency storefront editor drafts. Public storefront readers never use this table.';

COMMENT ON TABLE public.storefront_releases IS 'Immutable storefront publication snapshots used for audit and draft-first rollback.';

COMMENT ON COLUMN public.store_page_blocks.responsive_config IS 'Validated per-block responsive visibility and layout metadata.';