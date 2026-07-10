-- Recreate email triggers with robust unconfigured URL handling and SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.handle_subscription_status_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $$
DECLARE
  v_owner_email text;
  v_store_name text;
  v_store_slug text;
  v_payload jsonb;
  v_url text;
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

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_order_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_url text;
BEGIN
  -- Handle new orders (INSERT)
  IF TG_OP = 'INSERT' THEN
    v_payload := json_build_object(
      'templateName', 'order-receipt',
      'order_id', NEW.order_number,
      'store_id', NEW.store_id,
      'customer_email', NEW.customer_email,
      'customer_phone', NEW.customer_phone,
      'customer_name', NEW.customer_name,
      'total', NEW.total,
      'status', NEW.status
    );
  
  -- Handle order status changes (UPDATE)
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'shipped' OR NEW.status = 'delivered' OR NEW.status = 'cancelled' THEN
      v_payload := json_build_object(
        'templateName', 'order-' || NEW.status, -- e.g., 'order-shipped'
        'order_id', NEW.order_number,
        'store_id', NEW.store_id,
        'customer_email', NEW.customer_email,
        'customer_phone', NEW.customer_phone,
        'customer_name', NEW.customer_name,
        'total', NEW.total,
        'status', NEW.status
      );
    END IF;
  END IF;

  -- Dispatch webhook if payload was constructed
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

  RETURN NEW;
END;
$$;

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
  -- We only want to trigger this when lifecycle_status changes
  IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN
    
    -- Get the store details
    SELECT owner_id, name, slug INTO v_store_owner_id, v_store_name, v_store_slug
    FROM public.stores
    WHERE id = NEW.store_id;

    IF v_store_owner_id IS NOT NULL THEN
      -- Get the owner's email
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
        ELSIF NEW.lifecycle_status = 'deletion_queued' THEN
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

CREATE OR REPLACE FUNCTION public.handle_store_publish()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $$
DECLARE
  v_owner_email text;
  v_payload jsonb;
  v_url text;
BEGIN
  -- Trigger store-published if is_published changes to true
  IF (OLD.is_published IS FALSE OR OLD.is_published IS NULL) AND NEW.is_published IS TRUE THEN
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

  RETURN NEW;
END;
$$;
