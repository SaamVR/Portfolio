-- Step 0: Template Blueprint Schema Upgrades
-- Expands store_themes, store_page_blocks, and blueprints to support advanced template capabilities.

ALTER TABLE public.store_themes
  ADD COLUMN IF NOT EXISTS aesthetic text NOT NULL DEFAULT 'minimal',
  ADD COLUMN IF NOT EXISTS radius_scale numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS density_scale numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS effects jsonb NOT NULL DEFAULT '{"scrollReveals": false, "hoverEffects": true, "parallax": false, "intensity": "medium"}'::jsonb,
  ADD COLUMN IF NOT EXISTS palette_source text,
  ADD COLUMN IF NOT EXISTS palette_seed text,
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.store_page_blocks
  ADD COLUMN IF NOT EXISTS entrance_animation text,
  ADD COLUMN IF NOT EXISTS hover_effect text,
  ADD COLUMN IF NOT EXISTS effect_override boolean,
  ADD COLUMN IF NOT EXISTS layout_variant text,
  ADD COLUMN IF NOT EXISTS custom_html text,
  ADD COLUMN IF NOT EXISTS custom_css text;
-- Note: 'is_visible' already exists on this table.

ALTER TABLE public.store_blueprints
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.page_blueprints
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.cms_marketplace_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_image text,
  category text NOT NULL DEFAULT 'minimal',
  pricing_mode text NOT NULL DEFAULT 'free',
  price numeric NOT NULL DEFAULT 0,
  bundle_json jsonb NOT NULL,
  creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'published',
  install_count integer NOT NULL DEFAULT 0,
  rating_avg numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_marketplace_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published marketplace templates" ON public.cms_marketplace_templates;
CREATE POLICY "Anyone can read published marketplace templates"
  ON public.cms_marketplace_templates FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Authenticated users can publish marketplace templates" ON public.cms_marketplace_templates;
CREATE POLICY "Authenticated users can publish marketplace templates"
  ON public.cms_marketplace_templates FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = creator_id OR creator_id IS NULL);

DROP POLICY IF EXISTS "Creators can update their marketplace templates" ON public.cms_marketplace_templates;
CREATE POLICY "Creators can update their marketplace templates"
  ON public.cms_marketplace_templates FOR UPDATE TO authenticated
  USING ((select auth.uid()) = creator_id)
  WITH CHECK ((select auth.uid()) = creator_id);
