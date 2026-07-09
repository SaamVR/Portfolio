-- Add pg_cron extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to run daily store lifecycle checks
CREATE OR REPLACE FUNCTION public.check_store_lifecycles()
RETURNS void AS $$
BEGIN
  -- Mark stores as 'reminded' if they have been inactive for 30 days
  UPDATE public.stores
  SET lifecycle_status = 'reminded'
  WHERE lifecycle_status = 'active'
    AND updated_at < NOW() - INTERVAL '30 days';

  -- Mark stores as 'deletion_queued' if they have been 'reminded' and inactive for 60 days
  UPDATE public.stores
  SET lifecycle_status = 'deletion_queued'
  WHERE lifecycle_status = 'reminded'
    AND updated_at < NOW() - INTERVAL '60 days';

  -- Also check for past_due subscriptions that should be cancelled after grace period (e.g. 14 days)
  UPDATE public.store_subscriptions
  SET status = 'cancelled'
  WHERE status = 'past_due'
    AND updated_at < NOW() - INTERVAL '14 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run daily at midnight
SELECT cron.schedule('daily-store-lifecycle-check', '0 0 * * *', 'SELECT public.check_store_lifecycles()');
