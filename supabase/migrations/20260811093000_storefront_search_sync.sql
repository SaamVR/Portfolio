CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.dispatch_storefront_search_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id uuid;
  v_product_id uuid;
  v_action text;
  v_payload jsonb;
  v_sync_url text;
  v_sync_secret text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_store_id := OLD.store_id;
    v_product_id := OLD.id;
    v_action := 'delete';
  ELSE
    v_store_id := NEW.store_id;
    v_product_id := NEW.id;
    v_action := 'upsert';
  END IF;

  v_sync_url := current_setting('app.settings.storefront_search_sync_url', true);
  v_sync_secret := current_setting('app.settings.storefront_search_webhook_secret', true);

  IF coalesce(v_sync_url, '') = '' OR coalesce(v_sync_secret, '') = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_payload := jsonb_build_object(
    'action', v_action,
    'storeId', v_store_id,
    'productIds', jsonb_build_array(v_product_id)
  );

  PERFORM net.http_post(
    url := v_sync_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-commerce-webhook-secret', v_sync_secret
    ),
    body := v_payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_storefront_search_sync ON public.products;

CREATE TRIGGER on_storefront_search_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_storefront_search_sync();
