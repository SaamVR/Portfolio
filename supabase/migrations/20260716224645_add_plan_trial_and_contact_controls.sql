ALTER TABLE public.cms_plans
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS contact_only boolean NOT NULL DEFAULT false;

UPDATE public.cms_plans
SET trial_days = CASE
    WHEN trial_days IS NULL OR trial_days < 0 THEN 14
    ELSE trial_days
  END,
  contact_only = CASE
    WHEN id = 'pro' THEN true
    ELSE coalesce(contact_only, false)
  END;

ALTER TABLE public.cms_plans
  DROP CONSTRAINT IF EXISTS cms_plans_trial_days_nonnegative;

ALTER TABLE public.cms_plans
  ADD CONSTRAINT cms_plans_trial_days_nonnegative CHECK (trial_days >= 0);

UPDATE public.store_subscriptions AS subscription
SET status = 'past_due'
WHERE subscription.status = 'trialing'
  AND subscription.trial_ends_at IS NOT NULL
  AND subscription.trial_ends_at < now();

UPDATE public.stores AS store
SET is_published = false
FROM public.store_subscriptions AS subscription
WHERE subscription.store_id = store.id
  AND (
    subscription.status IN ('past_due', 'cancelled')
    OR (subscription.status = 'trialing' AND subscription.trial_ends_at IS NOT NULL AND subscription.trial_ends_at < now())
  );

CREATE OR REPLACE FUNCTION public.check_store_lifecycles()
RETURNS void AS $$
BEGIN
  UPDATE public.stores
  SET lifecycle_status = 'reminded'
  WHERE lifecycle_status = 'active'
    AND updated_at < NOW() - INTERVAL '30 days';

  UPDATE public.stores
  SET lifecycle_status = 'deletion_queued'
  WHERE lifecycle_status = 'reminded'
    AND updated_at < NOW() - INTERVAL '60 days';

  UPDATE public.store_subscriptions
  SET status = 'past_due'
  WHERE status = 'trialing'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < NOW();

  UPDATE public.stores AS store
  SET is_published = false
  FROM public.store_subscriptions AS subscription
  WHERE subscription.store_id = store.id
    AND (
      subscription.status IN ('past_due', 'cancelled')
      OR (subscription.status = 'trialing' AND subscription.trial_ends_at IS NOT NULL AND subscription.trial_ends_at < NOW())
    );

  UPDATE public.store_subscriptions
  SET status = 'cancelled'
  WHERE status = 'past_due'
    AND updated_at < NOW() - INTERVAL '14 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
