-- Keep lifecycle email automation aligned with the canonical enum value.
-- The enum uses pending_delete; older trigger definitions referenced deletion_queued.
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
