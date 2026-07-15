-- Migrate plan catalog from Starter/Growth/Scale to Basic/Advanced/Pro.

INSERT INTO public.cms_plans (id, name, description, monthly_price, store_limit, feature_flags, sort_order, is_active)
VALUES
  ('basic', 'Basic', 'Launch one store with core CMS blocks, theme tools, and manual or assisted payments.', 990, 1, '{"cms": true, "templates": true, "staff": 1}'::jsonb, 10, true),
  ('advanced', 'Advanced', 'Run campaigns, teams, coupons, reviews, and richer storefronts.', 1490, 3, '{"cms": true, "templates": true, "staff": 5, "analytics": true}'::jsonb, 20, true),
  ('pro', 'Pro', 'Agency and multi-brand package with custom domains and priority help.', 3990, NULL, '{"cms": true, "templates": true, "staff": -1, "custom_domains": true}'::jsonb, 30, true)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  store_limit = EXCLUDED.store_limit,
  feature_flags = EXCLUDED.feature_flags,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.cms_plan_features (plan_id, feature_key, enabled)
SELECT
  CASE legacy.plan_id
    WHEN 'starter' THEN 'basic'
    WHEN 'growth' THEN 'advanced'
    WHEN 'scale' THEN 'pro'
    ELSE legacy.plan_id
  END,
  legacy.feature_key,
  legacy.enabled
FROM public.cms_plan_features AS legacy
WHERE legacy.plan_id IN ('starter', 'growth', 'scale')
ON CONFLICT (plan_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled;

UPDATE public.store_subscriptions
SET
  plan_id = CASE plan_id
    WHEN 'starter' THEN 'basic'
    WHEN 'growth' THEN 'advanced'
    WHEN 'scale' THEN 'pro'
    ELSE plan_id
  END,
  status = CASE
    WHEN status = 'active' THEN 'trialing'
    ELSE status
  END,
  trial_ends_at = COALESCE(trial_ends_at, now() + interval '14 days'),
  updated_at = now()
WHERE plan_id IN ('starter', 'growth', 'scale');

UPDATE public.store_invoices
SET plan_id = CASE plan_id
  WHEN 'starter' THEN 'basic'
  WHEN 'growth' THEN 'advanced'
  WHEN 'scale' THEN 'pro'
  ELSE plan_id
END
WHERE plan_id IN ('starter', 'growth', 'scale');

UPDATE public.cms_signup_leads
SET desired_plan = CASE desired_plan
  WHEN 'starter' THEN 'basic'
  WHEN 'growth' THEN 'advanced'
  WHEN 'scale' THEN 'pro'
  ELSE desired_plan
END
WHERE desired_plan IN ('starter', 'growth', 'scale');

UPDATE public.stores
SET
  plan = CASE plan
    WHEN 'starter' THEN 'basic'
    WHEN 'growth' THEN 'advanced'
    WHEN 'scale' THEN 'pro'
    ELSE plan
  END,
  updated_at = now()
WHERE plan IN ('starter', 'growth', 'scale');

DELETE FROM public.cms_plan_features
WHERE plan_id IN ('starter', 'growth', 'scale');

DELETE FROM public.cms_plans
WHERE id IN ('starter', 'growth', 'scale');
