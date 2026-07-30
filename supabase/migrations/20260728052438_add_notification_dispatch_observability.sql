CREATE OR REPLACE FUNCTION public.handle_order_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_url text;
  v_service_role_key text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_payload := jsonb_build_object(
      'templateName', 'order-receipt',
      'order_id', NEW.order_number,
      'store_id', NEW.store_id,
      'customer_email', NEW.customer_email,
      'customer_phone', NEW.customer_phone,
      'customer_name', NEW.customer_name,
      'total', NEW.total,
      'status', NEW.status
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('shipped', 'delivered', 'cancelled') THEN
      v_payload := jsonb_build_object(
        'templateName', 'order-' || NEW.status,
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

  IF v_payload IS NULL THEN
    RETURN NEW;
  END IF;

  v_url := current_setting('app.settings.edge_function_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  IF coalesce(v_url, '') <> '' AND coalesce(v_service_role_key, '') <> '' THEN
    PERFORM net.http_post(
      url := rtrim(v_url, '/') || '/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := v_payload
    );
  ELSE
    INSERT INTO public.email_events (
      store_id,
      order_id,
      template_name,
      recipient,
      channel,
      status,
      provider,
      error,
      metadata
    )
    VALUES (
      NEW.store_id,
      NEW.order_number,
      v_payload->>'templateName',
      NEW.customer_email,
      'email',
      'failed',
      'supabase-edge',
      'Notification dispatch is not configured',
      jsonb_build_object(
        'source', 'database_trigger',
        'missingEdgeFunctionUrl', coalesce(v_url, '') = '',
        'missingServiceRoleKey', coalesce(v_service_role_key, '') = ''
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
