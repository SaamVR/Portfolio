-- Repairs live schema drift where migration history contains the editor
-- blueprint upgrade but the editor persistence columns are missing.

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

ALTER TABLE public.store_blueprints
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.page_blueprints
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;
