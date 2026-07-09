-- Add pg_net extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to trigger email on store lifecycle updates
CREATE OR REPLACE FUNCTION public.handle_store_lifecycle_update()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_email text;
  v_payload jsonb;
BEGIN
  -- We only want to trigger this when lifecycle_status changes
  IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN
    
    -- Get the owner's email
    SELECT email INTO v_owner_email
    FROM auth.users
    WHERE id = NEW.owner_id;

    IF v_owner_email IS NOT NULL THEN
      IF NEW.lifecycle_status = 'reminded' THEN
        v_payload := json_build_object(
          'to', v_owner_email,
          'templateName', 'inactivity-warning',
          'storeName', NEW.name,
          'storeSlug', NEW.slug
        );
      ELSIF NEW.lifecycle_status = 'deletion_queued' THEN
        v_payload := json_build_object(
          'to', v_owner_email,
          'templateName', 'deletion-notice',
          'storeName', NEW.name,
          'storeSlug', NEW.slug
        );
      END IF;

      IF v_payload IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.edge_function_url', true) || '/send-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := v_payload
        );
      END IF;
    END IF;
  END IF;

  -- Also trigger store-published if is_published changes to true
  IF OLD.is_published IS FALSE AND NEW.is_published IS TRUE THEN
    SELECT email INTO v_owner_email
    FROM auth.users
    WHERE id = NEW.owner_id;

    IF v_owner_email IS NOT NULL THEN
      v_payload := json_build_object(
        'to', v_owner_email,
        'templateName', 'store-published',
        'storeName', NEW.name,
        'storeSlug', NEW.slug
      );
      
      PERFORM net.http_post(
        url := current_setting('app.settings.edge_function_url', true) || '/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := v_payload
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on stores
DROP TRIGGER IF EXISTS on_store_lifecycle_update ON public.stores;
CREATE TRIGGER on_store_lifecycle_update
  AFTER UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_store_lifecycle_update();

-- Create function to trigger email on subscription status updates
CREATE OR REPLACE FUNCTION public.handle_subscription_status_update()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_email text;
  v_store_name text;
  v_store_slug text;
  v_payload jsonb;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Get store details and owner email
    SELECT s.name, s.slug, u.email INTO v_store_name, v_store_slug, v_owner_email
    FROM public.stores s
    JOIN auth.users u ON s.owner_id = u.id
    WHERE s.id = NEW.store_id;

    IF v_owner_email IS NOT NULL THEN
      IF NEW.status = 'past_due' THEN
        v_payload := json_build_object(
          'to', v_owner_email,
          'templateName', 'payment-reminder',
          'storeName', v_store_name,
          'storeSlug', v_store_slug
        );
      END IF;

      IF v_payload IS NOT NULL THEN
        PERFORM net.http_post(
          url := current_setting('app.settings.edge_function_url', true) || '/send-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body := v_payload
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on store_subscriptions
DROP TRIGGER IF EXISTS on_subscription_status_update ON public.store_subscriptions;
CREATE TRIGGER on_subscription_status_update
  AFTER UPDATE ON public.store_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_status_update();
