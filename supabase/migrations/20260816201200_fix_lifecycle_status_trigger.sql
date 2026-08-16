-- Keep lifecycle automation aligned with the canonical lifecycle table and enum.
-- Older definitions referenced stores.lifecycle_status and deletion_queued, neither
-- of which belongs to the current lifecycle model.
CREATE OR REPLACE FUNCTION public.handle_store_lifecycle_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $$
DECLARE
  v_owner_email text;
  v_payload jsonb;
  v_store_owner_id uuid;
  v_store_name text;
  v_store_slug text;
  v_url text;
BEGIN
  IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN
    SELECT owner_id, name, slug INTO v_store_owner_id, v_store_name, v_store_slug
    FROM public.stores
    WHERE id = NEW.store_id;

    IF v_store_owner_id IS NOT NULL THEN
      SELECT email INTO v_owner_email
      FROM auth.users
      WHERE id = v_store_owner_id;

      IF v_owner_email IS NOT NULL THEN
        IF NEW.lifecycle_status = 'reminded' THEN
          v_payload := json_build_object(
            'to', v_owner_email,
            'templateName', 'inactivity-warning',
            'storeName', v_store_name,
            'storeSlug', v_store_slug
          );
        ELSIF NEW.lifecycle_status = 'pending_delete' THEN
          v_payload := json_build_object(
            'to', v_owner_email,
            'templateName', 'deletion-notice',
            'storeName', v_store_name,
            'storeSlug', v_store_slug
          );
        END IF;

        IF v_payload IS NOT NULL THEN
          v_url := current_setting('app.settings.edge_function_url', true);
          IF v_url IS NOT NULL AND v_url <> '' THEN
            PERFORM net.http_post(
              url := v_url || '/send-email',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
              ),
              body := v_payload
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_store_lifecycle_update() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_store_lifecycle_update() TO authenticated, service_role;

-- The daily cron job created by the older migration calls this function by
-- name. Replacing it here automatically repairs the scheduled job without
-- creating a second cron entry.
CREATE OR REPLACE FUNCTION public.check_store_lifecycles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.store_lifecycle_states
  SET
    lifecycle_status = 'reminded',
    reminder_count = reminder_count + 1,
    last_reminder_at = now(),
    updated_at = now()
  WHERE lifecycle_status IN ('active', 'at_risk')
    AND manual_hold = false
    AND coalesce(last_activity_at, created_at) < now() - interval '30 days';

  UPDATE public.store_lifecycle_states
  SET
    lifecycle_status = 'pending_delete',
    scheduled_delete_at = coalesce(scheduled_delete_at, now() + interval '14 days'),
    updated_at = now()
  WHERE lifecycle_status = 'reminded'
    AND manual_hold = false
    AND coalesce(last_activity_at, created_at) < now() - interval '60 days';

  UPDATE public.store_subscriptions
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE status = 'past_due'
    AND updated_at < now() - interval '14 days';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_store_lifecycles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_store_lifecycles() TO service_role;
