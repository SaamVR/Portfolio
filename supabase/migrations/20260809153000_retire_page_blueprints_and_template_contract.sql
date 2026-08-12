ALTER TABLE public.store_business_profiles
  ADD COLUMN IF NOT EXISTS template_id text;
UPDATE public.store_business_profiles
SET template_id = COALESCE(template_id, blueprint_id)
WHERE template_id IS NULL
  AND blueprint_id IS NOT NULL;
UPDATE public.site_settings
SET value = jsonb_strip_nulls(
  CASE
    WHEN key IN ('storefront_profile', 'business_profile')
      AND jsonb_typeof(value) = 'object'
    THEN
      (value - 'blueprint_id' - 'blueprint_version')
      || CASE
        WHEN NOT ((value - 'blueprint_id' - 'blueprint_version') ? 'template_id')
          AND COALESCE(value->>'blueprint_id', '') <> ''
        THEN jsonb_build_object('template_id', value->>'blueprint_id')
        ELSE '{}'::jsonb
      END
    ELSE value
  END
)
WHERE key IN ('storefront_profile', 'business_profile');
ALTER TABLE public.store_business_profiles
  DROP COLUMN IF EXISTS blueprint_version;
ALTER TABLE public.store_business_profiles
  DROP COLUMN IF EXISTS blueprint_id;
DROP TABLE IF EXISTS public.page_blueprints;
