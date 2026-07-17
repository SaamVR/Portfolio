INSERT INTO public.cms_plans (
  id,
  name,
  description,
  monthly_price,
  annual_price,
  annual_discount_percentage,
  store_limit,
  feature_flags,
  sort_order,
  is_active,
  trial_days,
  contact_only
)
VALUES (
  'free',
  'Free',
  'Starter plan for one storefront on an EZComo-managed URL. Upgrade any time without rebuilding the store.',
  0,
  0,
  0,
  1,
  '{"cms": true, "templates": true, "staff": 0, "custom_domains": false}'::jsonb,
  5,
  true,
  0,
  false
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  annual_discount_percentage = EXCLUDED.annual_discount_percentage,
  store_limit = EXCLUDED.store_limit,
  feature_flags = EXCLUDED.feature_flags,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  trial_days = EXCLUDED.trial_days,
  contact_only = EXCLUDED.contact_only,
  updated_at = now();

INSERT INTO public.cms_plan_features (plan_id, feature_key, enabled)
VALUES
  ('free', 'cms_pages', true),
  ('free', 'launch_templates', true),
  ('free', 'media_library', true),
  ('free', 'backup_import', false),
  ('free', 'custom_domains', false),
  ('free', 'staff_management', false),
  ('free', 'theme_presets', true),
  ('free', 'advanced_analytics', false),
  ('free', 'automations', false),
  ('free', 'scheduled_backups', false),
  ('free', 'lifecycle_recovery', false)
ON CONFLICT (plan_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled, updated_at = now();
